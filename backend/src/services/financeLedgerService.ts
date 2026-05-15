import {
  CashSessionStatus,
  ExpenseStatus,
  FinanceDirection,
  FinancePaymentMethod,
  FinanceTransactionStatus,
  FinanceTransactionType,
  Prisma
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { FinanceTransactionSummary } from '../types/pos';

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

function endOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

function mapTransaction(row: {
  id: number;
  type: string;
  direction: string;
  amount: unknown;
  status: string;
  paymentMethod: string | null;
  sourceModule: string;
  sourceType: string;
  sourceId: number | null;
  sourceLabel: string | null;
  description: string | null;
  cashSessionId: number | null;
  employeeId: number | null;
  orderId: number | null;
  expenseId: number | null;
  createdById: number | null;
  occurredAt: Date;
  createdAt: Date;
  cashSession?: { businessDate: Date; status: string } | null;
  employee?: { fullName: string | null; user?: { fullName: string } | null } | null;
  order?: { id: number; type: string; status: string } | null;
  expense?: { category: string } | null;
  createdBy?: { fullName: string } | null;
}): FinanceTransactionSummary {
  return {
    id: row.id,
    type: row.type as FinanceTransactionSummary['type'],
    direction: row.direction as FinanceTransactionSummary['direction'],
    amount: Number(row.amount),
    status: row.status as FinanceTransactionSummary['status'],
    paymentMethod: row.paymentMethod as FinanceTransactionSummary['paymentMethod'],
    sourceModule: row.sourceModule,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    sourceLabel: row.sourceLabel,
    description: row.description,
    cashSessionId: row.cashSessionId,
    cashSessionLabel: row.cashSession ? row.cashSession.businessDate.toISOString().slice(0, 10) : null,
    employeeId: row.employeeId,
    employeeName: row.employee?.user?.fullName ?? row.employee?.fullName ?? null,
    orderId: row.orderId,
    expenseId: row.expenseId,
    createdById: row.createdById,
    createdByName: row.createdBy?.fullName ?? null,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString()
  };
}

export function transactionStatusFromExpense(status: ExpenseStatus): FinanceTransactionStatus {
  if (status === ExpenseStatus.planned) return FinanceTransactionStatus.pending;
  if (status === ExpenseStatus.partial) return FinanceTransactionStatus.partial;
  if (status === ExpenseStatus.cancelled) return FinanceTransactionStatus.cancelled;
  return FinanceTransactionStatus.paid;
}

export async function resolveOpenCashSessionId(client: PrismaClientLike, occurredAt = new Date()) {
  const businessDate = startOfDay(occurredAt);
  const session = await client.cashSession.findFirst({
    where: {
      status: CashSessionStatus.open,
      OR: [
        {
          shiftStartAt: { lte: occurredAt },
          autoCloseAt: { gte: occurredAt }
        },
        {
          shiftStartAt: { lte: occurredAt },
          shiftEndAt: { gte: occurredAt }
        },
        {
          businessDate,
          shiftTemplateId: null
        }
      ]
    },
    orderBy: [{ shiftStartAt: 'desc' }, { openedAt: 'desc' }],
    select: { id: true }
  });
  return session?.id ?? null;
}

export async function recordFinanceTransaction(
  client: PrismaClientLike,
  payload: {
    type: FinanceTransactionType;
    direction: FinanceDirection;
    amount: number;
    status?: FinanceTransactionStatus;
    paymentMethod?: FinancePaymentMethod | null;
    sourceModule: string;
    sourceType: string;
    sourceId?: number | null;
    sourceLabel?: string | null;
    description?: string | null;
    cashSessionId?: number | null;
    employeeId?: number | null;
    orderId?: number | null;
    expenseId?: number | null;
    createdById?: number | null;
    occurredAt?: Date;
  }
) {
  const occurredAt = payload.occurredAt ?? new Date();
  const amount = Math.max(Number(payload.amount) || 0, 0);
  const cashSessionId =
    payload.cashSessionId === undefined
      ? await resolveOpenCashSessionId(client, occurredAt)
      : payload.cashSessionId;
  const data = {
    type: payload.type,
    direction: payload.direction,
    amount,
    status: payload.status ?? FinanceTransactionStatus.paid,
    paymentMethod: payload.paymentMethod ?? null,
    sourceModule: payload.sourceModule,
    sourceType: payload.sourceType,
    sourceId: payload.sourceId ?? null,
    sourceLabel: payload.sourceLabel ? String(payload.sourceLabel).trim() : null,
    description: payload.description ? String(payload.description).trim() : null,
    cashSessionId: cashSessionId ?? null,
    employeeId: payload.employeeId ?? null,
    orderId: payload.orderId ?? null,
    expenseId: payload.expenseId ?? null,
    createdById: payload.createdById ?? null,
    occurredAt
  };

  if (payload.sourceId !== null && payload.sourceId !== undefined) {
    return client.financeTransaction.upsert({
      where: {
        type_sourceModule_sourceId: {
          type: payload.type,
          sourceModule: payload.sourceModule,
          sourceId: payload.sourceId
        }
      },
      update: data,
      create: data
    });
  }

  return client.financeTransaction.create({ data });
}

export async function cancelFinanceTransactionBySource(
  client: PrismaClientLike,
  payload: {
    type: FinanceTransactionType;
    sourceModule: string;
    sourceId: number;
  }
) {
  await client.financeTransaction.updateMany({
    where: payload,
    data: {
      status: FinanceTransactionStatus.cancelled,
      amount: 0
    }
  });
}

export async function listFinanceTransactions(filters?: {
  dateFrom?: string;
  dateTo?: string;
  type?: FinanceTransactionType | 'all';
  direction?: FinanceDirection | 'all';
  status?: FinanceTransactionStatus | 'all';
  sourceModule?: string;
}): Promise<FinanceTransactionSummary[]> {
  const now = new Date();
  const start = filters?.dateFrom ? startOfDay(new Date(filters.dateFrom)) : startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const end = filters?.dateTo ? endOfDay(new Date(filters.dateTo)) : endOfDay(now);

  const rows = await prisma.financeTransaction.findMany({
    where: {
      occurredAt: { gte: start, lte: end },
      type: filters?.type && filters.type !== 'all' ? filters.type : undefined,
      direction: filters?.direction && filters.direction !== 'all' ? filters.direction : undefined,
      status: filters?.status && filters.status !== 'all' ? filters.status : undefined,
      sourceModule: filters?.sourceModule && filters.sourceModule !== 'all' ? filters.sourceModule : undefined
    },
    include: {
      cashSession: true,
      employee: {
        include: { user: true }
      },
      order: true,
      expense: true,
      createdBy: true
    },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }]
  });

  return rows.map(mapTransaction);
}
