import { AlertStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AlertSummary } from '../types/pos';
import { HttpError } from '../utils/httpError';
import { requireField } from '../utils/validation';

function mapAlert(row: {
  id: number;
  title: string;
  description: string | null;
  dueAt: Date;
  status: string;
  createdById: number | null;
  createdBy?: { fullName: string } | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AlertSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueAt: row.dueAt.toISOString(),
    date: row.dueAt.toISOString().slice(0, 10),
    time: row.dueAt.toISOString().slice(11, 16),
    status: row.status as AlertSummary['status'],
    createdById: row.createdById,
    createdByName: row.createdBy?.fullName ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

async function refreshOverdueAlerts(client: typeof prisma | Prisma.TransactionClient = prisma) {
  await client.alert.updateMany({
    where: {
      status: AlertStatus.pending,
      dueAt: {
        lt: new Date()
      }
    },
    data: {
      status: AlertStatus.overdue
    }
  });
}

function parseDueAt(payload: { date?: string; time?: string; dueAt?: string }) {
  if (payload.dueAt) {
    const dueAt = new Date(payload.dueAt);
    if (!Number.isNaN(dueAt.getTime())) return dueAt;
  }

  requireField(payload, 'date');
  requireField(payload, 'time');
  const dueAt = new Date(`${payload.date}T${payload.time}:00`);
  if (Number.isNaN(dueAt.getTime())) {
    throw new HttpError(400, 'Date ou heure de rappel invalide');
  }
  return dueAt;
}

export async function listAlerts(): Promise<AlertSummary[]> {
  await refreshOverdueAlerts();
  const rows = await prisma.alert.findMany({
    include: {
      createdBy: true
    },
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { id: 'desc' }],
    take: 200
  });
  return rows.map(mapAlert);
}

export async function createAlert(payload: {
  title: string;
  description?: string | null;
  date?: string;
  time?: string;
  dueAt?: string;
  status?: AlertSummary['status'];
  createdById?: number | null;
}): Promise<AlertSummary> {
  requireField(payload, 'title');
  const dueAt = parseDueAt(payload);
  const status = payload.status === 'completed' ? AlertStatus.completed : dueAt < new Date() ? AlertStatus.overdue : AlertStatus.pending;
  const row = await prisma.alert.create({
    data: {
      title: String(payload.title).trim(),
      description: payload.description ? String(payload.description).trim() : null,
      dueAt,
      status,
      createdById: payload.createdById ?? null,
      completedAt: status === AlertStatus.completed ? new Date() : null
    },
    include: {
      createdBy: true
    }
  });
  return mapAlert(row);
}

export async function completeAlert(id: number): Promise<AlertSummary> {
  const existing = await prisma.alert.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, 'Rappel introuvable');
  }

  const row = await prisma.alert.update({
    where: { id },
    data: {
      status: AlertStatus.completed,
      completedAt: new Date()
    },
    include: {
      createdBy: true
    }
  });
  return mapAlert(row);
}
