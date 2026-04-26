import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/security';
import {
  PermissionSummary,
  RestaurantSettingsSummary,
  RestaurantTableSummary,
  RoleSummary,
  StaffUserSummary
} from '../types/pos';
import { HttpError } from '../utils/httpError';
import { requireField, toNonNegativeNumber, toPositiveNumber } from '../utils/validation';

function mapPermission(permission: {
  id: number;
  code: string;
  label: string;
  module: string;
  description: string | null;
}): PermissionSummary {
  return {
    id: permission.id,
    code: permission.code,
    label: permission.label,
    module: permission.module,
    description: permission.description
  };
}

export async function listPermissions(): Promise<PermissionSummary[]> {
  const rows = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { label: 'asc' }]
  });
  return rows.map(mapPermission);
}

export async function listRoles(): Promise<RoleSummary[]> {
  const rows = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: {
      permissions: {
        include: {
          permission: true
        }
      },
      _count: {
        select: {
          users: true
        }
      }
    }
  });

  return rows.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    usersCount: role._count.users,
    permissions: role.permissions.map((item) => mapPermission(item.permission))
  }));
}

export async function updateRolePermissions(roleId: number, permissionCodes: string[]): Promise<RoleSummary> {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw new HttpError(404, 'Role introuvable');
  }

  const permissions = await prisma.permission.findMany({
    where: {
      code: {
        in: permissionCodes
      }
    }
  });

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId,
          permissionId: permission.id
        }))
      });
    }
  });

  const updated = await listRoles();
  const nextRole = updated.find((item) => item.id === roleId);
  if (!nextRole) {
    throw new HttpError(500, 'Role mis a jour introuvable');
  }
  return nextRole;
}

export async function listStaffUsers(): Promise<StaffUserSummary[]> {
  const rows = await prisma.user.findMany({
    orderBy: [{ fullName: 'asc' }],
    include: {
      role: true
    }
  });

  return rows.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    status: user.status,
    roleId: user.roleId,
    roleName: user.role.name,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString()
  }));
}

export async function createStaffUser(payload: {
  fullName: string;
  username: string;
  email?: string | null;
  password: string;
  roleId: number;
  status?: 'active' | 'disabled';
}): Promise<StaffUserSummary> {
  requireField(payload, 'fullName');
  requireField(payload, 'username');
  requireField(payload, 'password');

  const role = await prisma.role.findUnique({ where: { id: Number(payload.roleId) } });
  if (!role) {
    throw new HttpError(404, 'Role introuvable');
  }

  const created = await prisma.user.create({
    data: {
      fullName: String(payload.fullName).trim(),
      username: String(payload.username).trim(),
      email: payload.email ? String(payload.email).trim() : null,
      passwordHash: hashPassword(String(payload.password)),
      roleId: role.id,
      status: payload.status ?? 'active'
    },
    include: {
      role: true
    }
  });

  return {
    id: created.id,
    fullName: created.fullName,
    username: created.username,
    email: created.email,
    status: created.status,
    roleId: created.roleId,
    roleName: created.role.name,
    lastLoginAt: created.lastLoginAt?.toISOString() ?? null,
    createdAt: created.createdAt.toISOString()
  };
}

export async function updateStaffUser(
  userId: number,
  payload: {
    fullName: string;
    username: string;
    email?: string | null;
    roleId: number;
    status: 'active' | 'disabled';
  }
): Promise<StaffUserSummary> {
  requireField(payload, 'fullName');
  requireField(payload, 'username');

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new HttpError(404, 'Utilisateur introuvable');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: String(payload.fullName).trim(),
      username: String(payload.username).trim(),
      email: payload.email ? String(payload.email).trim() : null,
      roleId: Number(payload.roleId),
      status: payload.status
    },
    include: {
      role: true
    }
  });

  return {
    id: updated.id,
    fullName: updated.fullName,
    username: updated.username,
    email: updated.email,
    status: updated.status,
    roleId: updated.roleId,
    roleName: updated.role.name,
    lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString()
  };
}

export async function resetStaffPassword(userId: number, password: string): Promise<void> {
  if (!password || password.trim().length < 6) {
    throw new HttpError(400, 'Mot de passe trop court');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashPassword(password)
    }
  });
}

export async function listRestaurantTables(): Promise<RestaurantTableSummary[]> {
  const rows = await prisma.restaurantTable.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
  });
  return rows.map((table) => ({
    id: table.id,
    name: table.name,
    zone: table.zone,
    capacity: table.capacity,
    isActive: table.isActive
  }));
}

export async function createRestaurantTable(payload: {
  name: string;
  zone?: string | null;
  capacity: number;
  isActive?: boolean;
}): Promise<RestaurantTableSummary> {
  requireField(payload, 'name');
  const created = await prisma.restaurantTable.create({
    data: {
      name: String(payload.name).trim(),
      zone: payload.zone ? String(payload.zone).trim() : null,
      capacity: Math.round(toPositiveNumber(payload.capacity, 'capacity')),
      isActive: payload.isActive ?? true
    }
  });
  return {
    id: created.id,
    name: created.name,
    zone: created.zone,
    capacity: created.capacity,
    isActive: created.isActive
  };
}

export async function updateRestaurantTable(
  id: number,
  payload: {
    name: string;
    zone?: string | null;
    capacity: number;
    isActive: boolean;
  }
): Promise<RestaurantTableSummary> {
  const updated = await prisma.restaurantTable.update({
    where: { id },
    data: {
      name: String(payload.name).trim(),
      zone: payload.zone ? String(payload.zone).trim() : null,
      capacity: Math.round(toPositiveNumber(payload.capacity, 'capacity')),
      isActive: Boolean(payload.isActive)
    }
  });

  return {
    id: updated.id,
    name: updated.name,
    zone: updated.zone,
    capacity: updated.capacity,
    isActive: updated.isActive
  };
}

export async function deleteRestaurantTable(id: number): Promise<void> {
  await prisma.restaurantTable.delete({ where: { id } });
}

export async function getRestaurantSettings(): Promise<RestaurantSettingsSummary> {
  const settings = await prisma.restaurantSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1
    }
  });

  return {
    restaurantName: settings.restaurantName,
    currency: settings.currency,
    defaultDeliveryFee: Number(settings.defaultDeliveryFee),
    lowStockThreshold: Number(settings.lowStockThreshold),
    receiptFooter: settings.receiptFooter
  };
}

export async function updateRestaurantSettings(payload: {
  restaurantName: string;
  currency: string;
  defaultDeliveryFee: number;
  lowStockThreshold: number;
  receiptFooter?: string | null;
}): Promise<RestaurantSettingsSummary> {
  requireField(payload, 'restaurantName');
  requireField(payload, 'currency');

  const updated = await prisma.restaurantSettings.upsert({
    where: { id: 1 },
    update: {
      restaurantName: String(payload.restaurantName).trim(),
      currency: String(payload.currency).trim(),
      defaultDeliveryFee: toNonNegativeNumber(payload.defaultDeliveryFee, 'defaultDeliveryFee'),
      lowStockThreshold: toNonNegativeNumber(payload.lowStockThreshold, 'lowStockThreshold'),
      receiptFooter: payload.receiptFooter ? String(payload.receiptFooter).trim() : null
    },
    create: {
      id: 1,
      restaurantName: String(payload.restaurantName).trim(),
      currency: String(payload.currency).trim(),
      defaultDeliveryFee: toNonNegativeNumber(payload.defaultDeliveryFee, 'defaultDeliveryFee'),
      lowStockThreshold: toNonNegativeNumber(payload.lowStockThreshold, 'lowStockThreshold'),
      receiptFooter: payload.receiptFooter ? String(payload.receiptFooter).trim() : null
    }
  });

  return {
    restaurantName: updated.restaurantName,
    currency: updated.currency,
    defaultDeliveryFee: Number(updated.defaultDeliveryFee),
    lowStockThreshold: Number(updated.lowStockThreshold),
    receiptFooter: updated.receiptFooter
  };
}
