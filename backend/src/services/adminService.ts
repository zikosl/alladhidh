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

  await prisma.employeeProfile.upsert({
    where: { userId: created.id },
    update: {
      isActive: created.status === 'active'
    },
    create: {
      userId: created.id,
      position: created.role.name,
      employmentType: 'monthly',
      baseSalary: 0,
      isActive: created.status === 'active'
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

  await prisma.employeeProfile.upsert({
    where: { userId: updated.id },
    update: {
      isActive: updated.status === 'active'
    },
    create: {
      userId: updated.id,
      position: updated.role.name,
      employmentType: 'monthly',
      baseSalary: 0,
      isActive: updated.status === 'active'
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
    logoUrl: settings.logoUrl,
    receiptTitle: settings.receiptTitle,
    receiptSubtitle: settings.receiptSubtitle,
    receiptAddress: settings.receiptAddress,
    receiptPhone: settings.receiptPhone,
    receiptEmail: settings.receiptEmail,
    receiptWebsite: settings.receiptWebsite,
    receiptFacebook: settings.receiptFacebook,
    receiptInstagram: settings.receiptInstagram,
    receiptTiktok: settings.receiptTiktok,
    receiptWhatsapp: settings.receiptWhatsapp,
    receiptFooter: settings.receiptFooter,
    receiptAdditionalNote: settings.receiptAdditionalNote,
    kitchenTicketHeader: settings.kitchenTicketHeader,
    kitchenTicketFooter: settings.kitchenTicketFooter,
    showContactBlock: settings.showContactBlock,
    showSocialLinks: settings.showSocialLinks,
    showFooterNote: settings.showFooterNote,
    showLogoInKitchenTicket: settings.showLogoInKitchenTicket,
    autoPrintKitchenTicket: settings.autoPrintKitchenTicket
  };
}

export async function updateRestaurantSettings(payload: {
  restaurantName: string;
  currency: string;
  defaultDeliveryFee: number;
  lowStockThreshold: number;
  logoUrl?: string | null;
  receiptTitle: string;
  receiptSubtitle?: string | null;
  receiptAddress?: string | null;
  receiptPhone?: string | null;
  receiptEmail?: string | null;
  receiptWebsite?: string | null;
  receiptFacebook?: string | null;
  receiptInstagram?: string | null;
  receiptTiktok?: string | null;
  receiptWhatsapp?: string | null;
  receiptFooter?: string | null;
  receiptAdditionalNote?: string | null;
  kitchenTicketHeader?: string | null;
  kitchenTicketFooter?: string | null;
  showContactBlock: boolean;
  showSocialLinks: boolean;
  showFooterNote: boolean;
  showLogoInKitchenTicket: boolean;
  autoPrintKitchenTicket: boolean;
}): Promise<RestaurantSettingsSummary> {
  requireField(payload, 'restaurantName');
  requireField(payload, 'currency');
  requireField(payload, 'receiptTitle');

  const updated = await prisma.restaurantSettings.upsert({
    where: { id: 1 },
    update: {
      restaurantName: String(payload.restaurantName).trim(),
      currency: String(payload.currency).trim(),
      defaultDeliveryFee: toNonNegativeNumber(payload.defaultDeliveryFee, 'defaultDeliveryFee'),
      lowStockThreshold: toNonNegativeNumber(payload.lowStockThreshold, 'lowStockThreshold'),
      logoUrl: payload.logoUrl ? String(payload.logoUrl).trim() : null,
      receiptTitle: String(payload.receiptTitle).trim(),
      receiptSubtitle: payload.receiptSubtitle ? String(payload.receiptSubtitle).trim() : null,
      receiptAddress: payload.receiptAddress ? String(payload.receiptAddress).trim() : null,
      receiptPhone: payload.receiptPhone ? String(payload.receiptPhone).trim() : null,
      receiptEmail: payload.receiptEmail ? String(payload.receiptEmail).trim() : null,
      receiptWebsite: payload.receiptWebsite ? String(payload.receiptWebsite).trim() : null,
      receiptFacebook: payload.receiptFacebook ? String(payload.receiptFacebook).trim() : null,
      receiptInstagram: payload.receiptInstagram ? String(payload.receiptInstagram).trim() : null,
      receiptTiktok: payload.receiptTiktok ? String(payload.receiptTiktok).trim() : null,
      receiptWhatsapp: payload.receiptWhatsapp ? String(payload.receiptWhatsapp).trim() : null,
      receiptFooter: payload.receiptFooter ? String(payload.receiptFooter).trim() : null,
      receiptAdditionalNote: payload.receiptAdditionalNote ? String(payload.receiptAdditionalNote).trim() : null,
      kitchenTicketHeader: payload.kitchenTicketHeader ? String(payload.kitchenTicketHeader).trim() : null,
      kitchenTicketFooter: payload.kitchenTicketFooter ? String(payload.kitchenTicketFooter).trim() : null,
      showContactBlock: Boolean(payload.showContactBlock),
      showSocialLinks: Boolean(payload.showSocialLinks),
      showFooterNote: Boolean(payload.showFooterNote),
      showLogoInKitchenTicket: Boolean(payload.showLogoInKitchenTicket),
      autoPrintKitchenTicket: Boolean(payload.autoPrintKitchenTicket)
    },
    create: {
      id: 1,
      restaurantName: String(payload.restaurantName).trim(),
      currency: String(payload.currency).trim(),
      defaultDeliveryFee: toNonNegativeNumber(payload.defaultDeliveryFee, 'defaultDeliveryFee'),
      lowStockThreshold: toNonNegativeNumber(payload.lowStockThreshold, 'lowStockThreshold'),
      logoUrl: payload.logoUrl ? String(payload.logoUrl).trim() : null,
      receiptTitle: String(payload.receiptTitle).trim(),
      receiptSubtitle: payload.receiptSubtitle ? String(payload.receiptSubtitle).trim() : null,
      receiptAddress: payload.receiptAddress ? String(payload.receiptAddress).trim() : null,
      receiptPhone: payload.receiptPhone ? String(payload.receiptPhone).trim() : null,
      receiptEmail: payload.receiptEmail ? String(payload.receiptEmail).trim() : null,
      receiptWebsite: payload.receiptWebsite ? String(payload.receiptWebsite).trim() : null,
      receiptFacebook: payload.receiptFacebook ? String(payload.receiptFacebook).trim() : null,
      receiptInstagram: payload.receiptInstagram ? String(payload.receiptInstagram).trim() : null,
      receiptTiktok: payload.receiptTiktok ? String(payload.receiptTiktok).trim() : null,
      receiptWhatsapp: payload.receiptWhatsapp ? String(payload.receiptWhatsapp).trim() : null,
      receiptFooter: payload.receiptFooter ? String(payload.receiptFooter).trim() : null,
      receiptAdditionalNote: payload.receiptAdditionalNote ? String(payload.receiptAdditionalNote).trim() : null,
      kitchenTicketHeader: payload.kitchenTicketHeader ? String(payload.kitchenTicketHeader).trim() : null,
      kitchenTicketFooter: payload.kitchenTicketFooter ? String(payload.kitchenTicketFooter).trim() : null,
      showContactBlock: Boolean(payload.showContactBlock),
      showSocialLinks: Boolean(payload.showSocialLinks),
      showFooterNote: Boolean(payload.showFooterNote),
      showLogoInKitchenTicket: Boolean(payload.showLogoInKitchenTicket),
      autoPrintKitchenTicket: Boolean(payload.autoPrintKitchenTicket)
    }
  });

  return {
    restaurantName: updated.restaurantName,
    currency: updated.currency,
    defaultDeliveryFee: Number(updated.defaultDeliveryFee),
    lowStockThreshold: Number(updated.lowStockThreshold),
    logoUrl: updated.logoUrl,
    receiptTitle: updated.receiptTitle,
    receiptSubtitle: updated.receiptSubtitle,
    receiptAddress: updated.receiptAddress,
    receiptPhone: updated.receiptPhone,
    receiptEmail: updated.receiptEmail,
    receiptWebsite: updated.receiptWebsite,
    receiptFacebook: updated.receiptFacebook,
    receiptInstagram: updated.receiptInstagram,
    receiptTiktok: updated.receiptTiktok,
    receiptWhatsapp: updated.receiptWhatsapp,
    receiptFooter: updated.receiptFooter,
    receiptAdditionalNote: updated.receiptAdditionalNote,
    kitchenTicketHeader: updated.kitchenTicketHeader,
    kitchenTicketFooter: updated.kitchenTicketFooter,
    showContactBlock: updated.showContactBlock,
    showSocialLinks: updated.showSocialLinks,
    showFooterNote: updated.showFooterNote,
    showLogoInKitchenTicket: updated.showLogoInKitchenTicket,
    autoPrintKitchenTicket: updated.autoPrintKitchenTicket
  };
}
