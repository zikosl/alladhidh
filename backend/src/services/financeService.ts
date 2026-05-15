import {
  CashSessionStatus,
  EmployeeAccountTransactionType,
  ExpenseSourceType,
  ExpenseStatus,
  ExpenseType,
  FinanceDirection,
  FinancePaymentMethod,
  FinanceTransactionStatus,
  FinanceTransactionType,
  PayrollAdjustmentType,
  PayrollPaymentMode,
  PayrollPeriodStatus,
  Prisma
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { systemExpenseCategories, upsertLinkedExpense } from './expenseSyncService';
import {
  cancelFinanceTransactionBySource,
  listFinanceTransactions as listLedgerTransactions,
  recordFinanceTransaction,
  transactionStatusFromExpense
} from './financeLedgerService';
import {
  CashSessionSummary,
  EmployeeProfileSummary,
  ExpenseCategorySummary,
  ExpenseSummary,
  FinanceTransactionSummary,
  PayrollAdjustmentSummary,
  PayrollPeriodSummary,
  SalaryAdvanceSummary,
  ShiftTemplateSummary
} from '../types/pos';
import { HttpError } from '../utils/httpError';
import { requireField, toNonNegativeNumber, toPositiveNumber } from '../utils/validation';

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

function endOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseClock(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new HttpError(400, 'Heure de shift invalide');
  }
  return hours * 60 + minutes;
}

function minutesOfDay(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

function buildShiftWindow(template: { startTime: string; endTime: string; autoCloseMinutes: number }, now = new Date()) {
  const startMinutes = parseClock(template.startTime);
  const endMinutes = parseClock(template.endTime);
  const currentMinutes = minutesOfDay(now);
  const crossesMidnight = endMinutes <= startMinutes;
  const startDate = startOfDay(now);

  if (crossesMidnight && currentMinutes < endMinutes) {
    startDate.setDate(startDate.getDate() - 1);
  }

  const shiftStartAt = addMinutes(startDate, startMinutes);
  const shiftEndAt = addMinutes(startDate, endMinutes + (crossesMidnight ? 24 * 60 : 0));
  const autoCloseAt = addMinutes(shiftEndAt, template.autoCloseMinutes);
  return {
    businessDate: startOfDay(shiftStartAt),
    shiftStartAt,
    shiftEndAt,
    autoCloseAt
  };
}

function isShiftActiveNow(template: { startTime: string; endTime: string; activeDays: string }, now = new Date()) {
  const days = new Set(template.activeDays.split(',').map((day) => Number(day.trim())).filter((day) => Number.isInteger(day)));
  const startMinutes = parseClock(template.startTime);
  const endMinutes = parseClock(template.endTime);
  const currentMinutes = minutesOfDay(now);
  const crossesMidnight = endMinutes <= startMinutes;
  const activeDay = crossesMidnight && currentMinutes < endMinutes ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getDay() : now.getDay();
  if (!days.has(activeDay)) return false;
  return crossesMidnight ? currentMinutes >= startMinutes || currentMinutes < endMinutes : currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function mapShiftTemplate(row: {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  activeDays: string;
  autoCloseMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ShiftTemplateSummary {
  return {
    id: row.id,
    name: row.name,
    startTime: row.startTime,
    endTime: row.endTime,
    activeDays: row.activeDays.split(',').map((day) => Number(day)).filter((day) => Number.isInteger(day)),
    autoCloseMinutes: row.autoCloseMinutes,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapExpenseCategory(row: {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { expenses: number };
}): ExpenseCategorySummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    expensesCount: row._count.expenses
  };
}

function mapExpense(row: {
  id: number;
  amount: unknown;
  category: string;
  categoryId: number | null;
  type: string;
  status: string;
  paymentMethod: string | null;
  supplierName: string | null;
  description: string | null;
  sourceType: string;
  sourceId: number | null;
  sourceLabel: string | null;
  dueDate: Date | null;
  paidAt: Date | null;
  date: Date;
}): ExpenseSummary {
  return {
    id: row.id,
    amount: Number(row.amount),
    category: row.category,
    categoryId: row.categoryId,
    type: row.type as ExpenseSummary['type'],
    status: row.status as ExpenseSummary['status'],
    paymentMethod: row.paymentMethod as ExpenseSummary['paymentMethod'],
    supplierName: row.supplierName,
    description: row.description,
    sourceType: row.sourceType as ExpenseSummary['sourceType'],
    sourceId: row.sourceId,
    sourceLabel: row.sourceLabel,
    isSystemGenerated: row.sourceType !== ExpenseSourceType.manual,
    dueDate: toIso(row.dueDate),
    paidAt: toIso(row.paidAt),
    date: row.date.toISOString()
  };
}

function mapEmployeeProfile(row: {
  id: number;
  userId: number | null;
  fullName: string | null;
  position: string | null;
  employmentType: string;
  baseSalary: unknown;
  hireDate: Date | null;
  isActive: boolean;
  payrollNotes: string | null;
  user: {
    fullName: string;
    username: string;
    role: { name: string };
  } | null;
}): EmployeeProfileSummary {
  const fullName = row.user?.fullName ?? row.fullName ?? 'Employe';
  return {
    id: row.id,
    userId: row.userId,
    fullName,
    username: row.user?.username ?? null,
    roleName: row.user?.role.name ?? 'Employe',
    position: row.position,
    employmentType: row.employmentType as EmployeeProfileSummary['employmentType'],
    baseSalary: Number(row.baseSalary),
    hireDate: toIso(row.hireDate),
    isActive: row.isActive,
    payrollNotes: row.payrollNotes
  };
}

function employeeDisplayName(employee: { fullName: string | null; user?: { fullName: string } | null }) {
  return employee.user?.fullName ?? employee.fullName ?? 'Employe';
}

function mapAdvance(row: {
  id: number;
  employeeId: number;
  amount: unknown;
  remainingAmount: unknown;
  reason: string;
  note: string | null;
  date: Date;
  employee: { fullName: string | null; user?: { fullName: string } | null };
}): SalaryAdvanceSummary {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: employeeDisplayName(row.employee),
    amount: Number(row.amount),
    remainingAmount: Number(row.remainingAmount),
    reason: row.reason,
    note: row.note,
    date: row.date.toISOString()
  };
}

function mapPayrollAdjustment(row: {
  id: number;
  employeeId: number;
  periodId: number | null;
  type: string;
  amount: unknown;
  reason: string;
  note: string | null;
  date: Date;
  employee: { fullName: string | null; user?: { fullName: string } | null };
  period?: { label: string } | null;
}): PayrollAdjustmentSummary {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: employeeDisplayName(row.employee),
    periodId: row.periodId,
    periodLabel: row.period?.label ?? null,
    type: row.type as PayrollAdjustmentSummary['type'],
    amount: Number(row.amount),
    reason: row.reason,
    note: row.note,
    date: row.date.toISOString()
  };
}

function mapCashSession(
  row: {
    id: number;
    businessDate: Date;
    shiftTemplateId: number | null;
    shiftName: string | null;
    shiftStartAt: Date | null;
    shiftEndAt: Date | null;
    autoCloseAt: Date | null;
    closedBySystem: boolean;
    openingAmount: unknown;
    closingAmount: unknown | null;
    expectedCash: unknown;
    difference: unknown;
    status: string;
    openedById: number | null;
    closedById: number | null;
    notes: string | null;
    openedAt: Date;
    closedAt: Date | null;
    openedBy?: { fullName: string } | null;
    closedBy?: { fullName: string } | null;
    shiftTemplate?: { name: string } | null;
  },
  totals?: { cashIn: number; cashOut: number }
): CashSessionSummary {
  const openingAmount = Number(row.openingAmount);
  const closingAmount = row.closingAmount === null ? null : Number(row.closingAmount);
  const expectedCash = totals ? openingAmount + totals.cashIn - totals.cashOut : Number(row.expectedCash);
  const difference = totals ? (closingAmount === null ? 0 : closingAmount - expectedCash) : Number(row.difference);
  return {
    id: row.id,
    businessDate: dateOnly(row.businessDate),
    shiftTemplateId: row.shiftTemplateId,
    shiftName: row.shiftName ?? row.shiftTemplate?.name ?? null,
    shiftStartAt: toIso(row.shiftStartAt),
    shiftEndAt: toIso(row.shiftEndAt),
    autoCloseAt: toIso(row.autoCloseAt),
    closedBySystem: row.closedBySystem,
    openingAmount,
    closingAmount,
    cashIn: totals?.cashIn ?? 0,
    cashOut: totals?.cashOut ?? 0,
    expectedCash,
    difference,
    status: row.status as CashSessionSummary['status'],
    openedById: row.openedById,
    openedByName: row.openedBy?.fullName ?? null,
    closedById: row.closedById,
    closedByName: row.closedBy?.fullName ?? null,
    notes: row.notes,
    openedAt: row.openedAt.toISOString(),
    closedAt: toIso(row.closedAt)
  };
}

function computePaymentStatus(netSalary: number, paidAmount: number): 'unpaid' | 'partial' | 'paid' {
  if (paidAmount <= 0) return 'unpaid';
  if (paidAmount + 0.001 >= netSalary) return 'paid';
  return 'partial';
}

export async function listExpenseCategories(): Promise<ExpenseCategorySummary[]> {
  const rows = await prisma.expenseCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { expenses: true }
      }
    }
  });
  return rows.map(mapExpenseCategory);
}

export async function createExpenseCategory(payload: {
  name: string;
  description?: string | null;
}): Promise<ExpenseCategorySummary> {
  requireField(payload, 'name');
  const created = await prisma.expenseCategory.create({
    data: {
      name: String(payload.name).trim(),
      description: payload.description ? String(payload.description).trim() : null
    },
    include: {
      _count: {
        select: { expenses: true }
      }
    }
  });
  return mapExpenseCategory(created);
}

export async function deleteExpenseCategory(id: number): Promise<void> {
  const existing = await prisma.expenseCategory.findUnique({
    where: { id },
    include: {
      _count: { select: { expenses: true } }
    }
  });
  if (!existing) {
    throw new HttpError(404, 'Categorie de depense introuvable');
  }
  if (existing._count.expenses > 0) {
    throw new HttpError(400, 'Impossible de supprimer une categorie deja utilisee');
  }
  await prisma.expenseCategory.delete({ where: { id } });
}

export async function listExpenses(): Promise<ExpenseSummary[]> {
  const rows = await prisma.expense.findMany({
    orderBy: [{ date: 'desc' }, { id: 'desc' }]
  });
  return rows.map(mapExpense);
}

export async function listFinanceTransactions(filters?: {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  direction?: string;
  status?: string;
  sourceModule?: string;
}): Promise<FinanceTransactionSummary[]> {
  const allowedTypes = Object.values(FinanceTransactionType) as string[];
  const allowedDirections = Object.values(FinanceDirection) as string[];
  const allowedStatuses = Object.values(FinanceTransactionStatus) as string[];
  return listLedgerTransactions({
    dateFrom: filters?.dateFrom,
    dateTo: filters?.dateTo,
    type: filters?.type && (filters.type === 'all' || allowedTypes.includes(filters.type)) ? filters.type as FinanceTransactionType | 'all' : undefined,
    direction: filters?.direction && (filters.direction === 'all' || allowedDirections.includes(filters.direction)) ? filters.direction as FinanceDirection | 'all' : undefined,
    status: filters?.status && (filters.status === 'all' || allowedStatuses.includes(filters.status)) ? filters.status as FinanceTransactionStatus | 'all' : undefined,
    sourceModule: filters?.sourceModule
  });
}

async function resolveExpenseCategory(categoryId?: number | null) {
  if (!categoryId) {
    throw new HttpError(400, 'Categorie de depense requise');
  }
  const category = await prisma.expenseCategory.findUnique({ where: { id: Number(categoryId) } });
  if (!category) {
    throw new HttpError(404, 'Categorie de depense introuvable');
  }
  return category;
}

export async function createExpense(payload: {
  amount: number;
  categoryId?: number | null;
  type: ExpenseSummary['type'];
  status: ExpenseSummary['status'];
  paymentMethod?: ExpenseSummary['paymentMethod'];
  supplierName?: string | null;
  description?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  date?: string | null;
}): Promise<ExpenseSummary> {
  const category = await resolveExpenseCategory(payload.categoryId);
  const amount = toPositiveNumber(payload.amount, 'amount');
  const status = payload.status as ExpenseStatus;
  const date = payload.date ? new Date(payload.date) : new Date();
  const created = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
      amount,
      category: category.name,
      categoryId: category.id,
      type: payload.type,
      status,
      paymentMethod: payload.paymentMethod ?? null,
      supplierName: payload.supplierName ? String(payload.supplierName).trim() : null,
      description: payload.description ? String(payload.description).trim() : null,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      paidAt: payload.paidAt ? new Date(payload.paidAt) : null,
      date
      }
    });
    await recordFinanceTransaction(tx, {
      type: FinanceTransactionType.manual_expense,
      direction: FinanceDirection.out,
      amount,
      status: transactionStatusFromExpense(status),
      paymentMethod: payload.paymentMethod ?? null,
      sourceModule: 'finance',
      sourceType: ExpenseSourceType.manual,
      sourceId: expense.id,
      sourceLabel: category.name,
      description: payload.description ?? category.name,
      expenseId: expense.id,
      occurredAt: date
    });
    return expense;
  });
  return mapExpense(created);
}

export async function updateExpense(
  id: number,
  payload: {
    amount: number;
    categoryId?: number | null;
    type: ExpenseSummary['type'];
    status: ExpenseSummary['status'];
    paymentMethod?: ExpenseSummary['paymentMethod'];
    supplierName?: string | null;
    description?: string | null;
    dueDate?: string | null;
    paidAt?: string | null;
    date?: string | null;
  }
): Promise<ExpenseSummary> {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, 'Depense introuvable');
  }
  if (existing.sourceType !== ExpenseSourceType.manual) {
    throw new HttpError(400, 'Cette depense est generee automatiquement depuis un autre module');
  }
  const category = await resolveExpenseCategory(payload.categoryId);
  const amount = toPositiveNumber(payload.amount, 'amount');
  const status = payload.status as ExpenseStatus;
  const date = payload.date ? new Date(payload.date) : existing.date;
  const updated = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.update({
      where: { id },
      data: {
      amount,
      category: category.name,
      categoryId: category.id,
      type: payload.type,
      status,
      paymentMethod: payload.paymentMethod ?? null,
      supplierName: payload.supplierName ? String(payload.supplierName).trim() : null,
      description: payload.description ? String(payload.description).trim() : null,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      paidAt: payload.paidAt ? new Date(payload.paidAt) : null,
      date
      }
    });
    await recordFinanceTransaction(tx, {
      type: FinanceTransactionType.manual_expense,
      direction: FinanceDirection.out,
      amount,
      status: transactionStatusFromExpense(status),
      paymentMethod: payload.paymentMethod ?? null,
      sourceModule: 'finance',
      sourceType: ExpenseSourceType.manual,
      sourceId: expense.id,
      sourceLabel: category.name,
      description: payload.description ?? category.name,
      expenseId: expense.id,
      occurredAt: date
    });
    return expense;
  });
  return mapExpense(updated);
}

export async function deleteExpense(id: number): Promise<void> {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, 'Depense introuvable');
  }
  if (existing.sourceType !== ExpenseSourceType.manual) {
    throw new HttpError(400, 'Cette depense est liee a un module source et ne peut pas etre supprimee ici');
  }
  await prisma.$transaction(async (tx) => {
    await cancelFinanceTransactionBySource(tx, {
      type: FinanceTransactionType.manual_expense,
      sourceModule: 'finance',
      sourceId: id
    });
    await tx.expense.delete({ where: { id } });
  });
}

async function calculateCashSessionTotals(
  window: { openedAt?: Date; closedAt?: Date | null; shiftStartAt?: Date | null; shiftEndAt?: Date | null; businessDate: Date },
  openingAmount: number,
  closingAmount?: number | null
) {
  const start = window.shiftStartAt ?? window.openedAt ?? startOfDay(window.businessDate);
  const end = window.closedAt ?? window.shiftEndAt ?? endOfDay(window.businessDate);
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: {
        method: 'cash',
        createdAt: { gte: start, lte: end }
      }
    }),
    prisma.expense.findMany({
      where: {
        status: ExpenseStatus.paid,
        paymentMethod: 'cash',
        date: { gte: start, lte: end }
      }
    })
  ]);
  const cashIn = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const cashOut = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const expectedCash = openingAmount + cashIn - cashOut;
  return {
    cashIn,
    cashOut,
    expectedCash,
    difference: closingAmount === null || closingAmount === undefined ? 0 : closingAmount - expectedCash
  };
}

async function closeExpiredCashSessions() {
  const now = new Date();
  const expired = await prisma.cashSession.findMany({
    where: {
      status: CashSessionStatus.open,
      autoCloseAt: { lte: now }
    }
  });

  for (const session of expired) {
    const totals = await calculateCashSessionTotals(session, Number(session.openingAmount), null);
    await prisma.$transaction(async (tx) => {
      const closed = await tx.cashSession.update({
        where: { id: session.id },
        data: {
          status: CashSessionStatus.closed,
          expectedCash: totals.expectedCash,
          difference: 0,
          closingAmount: null,
          closedAt: session.autoCloseAt ?? now,
          closedBySystem: true
        }
      });
      await recordFinanceTransaction(tx, {
        type: FinanceTransactionType.cash_closing,
        direction: FinanceDirection.neutral,
        amount: 0,
        status: FinanceTransactionStatus.paid,
        paymentMethod: FinancePaymentMethod.cash,
        sourceModule: 'caisse',
        sourceType: 'cash_session',
        sourceId: closed.id,
        sourceLabel: `${closed.shiftName ?? 'Shift'} - ${dateOnly(closed.businessDate)}`,
        description: `Cloture automatique - ${closed.shiftName ?? dateOnly(closed.businessDate)}`,
        cashSessionId: closed.id,
        occurredAt: closed.closedAt ?? now
      });
    });
  }
}

export async function listShiftTemplates(): Promise<ShiftTemplateSummary[]> {
  const rows = await prisma.shiftTemplate.findMany({
    orderBy: [{ isActive: 'desc' }, { startTime: 'asc' }, { name: 'asc' }]
  });
  return rows.map(mapShiftTemplate);
}

export async function upsertShiftTemplate(payload: {
  id?: number;
  name: string;
  startTime: string;
  endTime: string;
  activeDays?: number[];
  autoCloseMinutes?: number;
  isActive?: boolean;
}): Promise<ShiftTemplateSummary> {
  requireField(payload, 'name');
  requireField(payload, 'startTime');
  requireField(payload, 'endTime');
  parseClock(payload.startTime);
  parseClock(payload.endTime);
  const activeDays = (payload.activeDays?.length ? payload.activeDays : [0, 1, 2, 3, 4, 5, 6])
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  const data = {
    name: String(payload.name).trim(),
    startTime: payload.startTime,
    endTime: payload.endTime,
    activeDays: activeDays.join(','),
    autoCloseMinutes: toNonNegativeNumber(payload.autoCloseMinutes ?? 0, 'autoCloseMinutes'),
    isActive: payload.isActive ?? true
  };
  const row = payload.id
    ? await prisma.shiftTemplate.update({ where: { id: Number(payload.id) }, data })
    : await prisma.shiftTemplate.create({ data });
  return mapShiftTemplate(row);
}

export async function deleteShiftTemplate(id: number): Promise<void> {
  const used = await prisma.cashSession.count({ where: { shiftTemplateId: id } });
  if (used > 0) {
    await prisma.shiftTemplate.update({ where: { id }, data: { isActive: false } });
    return;
  }
  await prisma.shiftTemplate.delete({ where: { id } });
}

async function resolveCurrentShiftTemplate(now = new Date()) {
  const templates = await prisma.shiftTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ startTime: 'asc' }, { id: 'asc' }]
  });
  return templates.find((template) => isShiftActiveNow(template, now)) ?? null;
}

export async function listCashSessions(): Promise<CashSessionSummary[]> {
  await closeExpiredCashSessions();
  const rows = await prisma.cashSession.findMany({
    include: {
      openedBy: true,
      closedBy: true,
      shiftTemplate: true
    },
    orderBy: [{ businessDate: 'desc' }, { id: 'desc' }]
  });

  const withTotals = await Promise.all(
    rows.map(async (row) => {
      const totals = await calculateCashSessionTotals(row, Number(row.openingAmount), row.closingAmount === null ? null : Number(row.closingAmount));
      return mapCashSession(row, totals);
    })
  );

  return withTotals;
}

export async function getOpenCashSessionForToday(): Promise<CashSessionSummary | null> {
  await closeExpiredCashSessions();
  const now = new Date();
  const currentShift = await resolveCurrentShiftTemplate(now);
  if (!currentShift) return null;
  const window = buildShiftWindow(currentShift, now);
  const row = await prisma.cashSession.findFirst({
    where: {
      businessDate: window.businessDate,
      shiftTemplateId: currentShift.id,
      status: CashSessionStatus.open
    },
    include: {
      openedBy: true,
      closedBy: true,
      shiftTemplate: true
    },
    orderBy: { openedAt: 'desc' }
  });
  if (!row) return null;
  const totals = await calculateCashSessionTotals(row, Number(row.openingAmount), row.closingAmount === null ? null : Number(row.closingAmount));
  return mapCashSession(row, totals);
}

export async function upsertCashSession(payload: {
  id?: number;
  businessDate: string;
  shiftTemplateId?: number | null;
  openingAmount: number;
  closingAmount?: number | null;
  status?: CashSessionSummary['status'];
  openedById?: number | null;
  closedById?: number | null;
  notes?: string | null;
}): Promise<CashSessionSummary> {
  requireField(payload, 'businessDate');
  const now = new Date();
  const businessDate = startOfDay(new Date(payload.businessDate));
  if (Number.isNaN(businessDate.getTime())) {
    throw new HttpError(400, 'Date de caisse invalide');
  }
  const existingSession = payload.id
    ? await prisma.cashSession.findUnique({
      where: { id: Number(payload.id) },
      include: { shiftTemplate: true }
    })
    : null;
  if (payload.id && !existingSession) {
    throw new HttpError(404, 'Session de caisse introuvable');
  }
  const shiftTemplateId = payload.shiftTemplateId ? Number(payload.shiftTemplateId) : null;
  const shiftTemplate = shiftTemplateId
    ? await prisma.shiftTemplate.findUnique({ where: { id: shiftTemplateId } })
    : existingSession?.shiftTemplate ?? await resolveCurrentShiftTemplate(now);
  if (!payload.id && !shiftTemplate) {
    throw new HttpError(400, 'Aucun shift actif ne correspond a cette heure');
  }
  const shiftWindow = existingSession && !payload.shiftTemplateId
    ? {
      businessDate: existingSession.businessDate,
      shiftStartAt: existingSession.shiftStartAt,
      shiftEndAt: existingSession.shiftEndAt,
      autoCloseAt: existingSession.autoCloseAt
    }
    : shiftTemplate
      ? buildShiftWindow(shiftTemplate, now)
      : null;
  const openingAmount = toNonNegativeNumber(payload.openingAmount, 'openingAmount');
  const closingAmount =
    payload.closingAmount === null || payload.closingAmount === undefined || String(payload.closingAmount) === ''
      ? null
      : toNonNegativeNumber(payload.closingAmount, 'closingAmount');
  const status = payload.status ?? (closingAmount === null ? CashSessionStatus.open : CashSessionStatus.closed);
  const sessionWindow = {
    businessDate: shiftWindow?.businessDate ?? businessDate,
    openedAt: shiftWindow?.shiftStartAt ?? new Date(),
    closedAt: status === CashSessionStatus.closed ? new Date() : null,
    shiftStartAt: shiftWindow?.shiftStartAt ?? null,
    shiftEndAt: shiftWindow?.shiftEndAt ?? null
  };
  const totals = await calculateCashSessionTotals(sessionWindow, openingAmount, closingAmount);
  const data = {
    businessDate: shiftWindow?.businessDate ?? businessDate,
    shiftTemplateId: shiftTemplate?.id ?? null,
    shiftName: shiftTemplate?.name ?? null,
    shiftStartAt: shiftWindow?.shiftStartAt ?? null,
    shiftEndAt: shiftWindow?.shiftEndAt ?? null,
    autoCloseAt: shiftWindow?.autoCloseAt ?? null,
    closedBySystem: false,
    openingAmount,
    closingAmount,
    expectedCash: totals.expectedCash,
    difference: totals.difference,
    status,
    openedById: payload.openedById ?? null,
    closedById: status === CashSessionStatus.closed ? payload.closedById ?? null : null,
    notes: payload.notes ? String(payload.notes).trim() : null,
    closedAt: status === CashSessionStatus.closed ? new Date() : null
  };

  const row = await prisma.$transaction(async (tx) => {
    if (!payload.id && shiftTemplate) {
      const duplicate = await tx.cashSession.findFirst({
        where: {
          businessDate: data.businessDate,
          shiftTemplateId: shiftTemplate.id
        }
      });
      if (duplicate) {
        throw new HttpError(400, 'La caisse de ce shift est deja ouverte');
      }
    }

    const saved = payload.id
      ? await tx.cashSession.update({
        where: { id: Number(payload.id) },
        data,
        include: { openedBy: true, closedBy: true, shiftTemplate: true }
      })
      : await tx.cashSession.create({
        data: {
          ...data,
          openedAt: shiftWindow?.shiftStartAt ?? new Date()
        },
        include: { openedBy: true, closedBy: true, shiftTemplate: true }
      });

    await recordFinanceTransaction(tx, {
      type: FinanceTransactionType.cash_opening,
      direction: FinanceDirection.neutral,
      amount: openingAmount,
      status: FinanceTransactionStatus.paid,
      paymentMethod: FinancePaymentMethod.cash,
      sourceModule: 'caisse',
      sourceType: 'cash_session',
      sourceId: saved.id,
      sourceLabel: `${saved.shiftName ?? 'Journee'} - ${dateOnly(saved.businessDate)}`,
      description: `Ouverture caisse - ${saved.shiftName ?? dateOnly(saved.businessDate)}`,
      cashSessionId: saved.id,
      createdById: saved.openedById,
      occurredAt: saved.openedAt
    });

    if (status === CashSessionStatus.closed) {
      await recordFinanceTransaction(tx, {
        type: FinanceTransactionType.cash_closing,
        direction: FinanceDirection.neutral,
        amount: closingAmount ?? 0,
        status: FinanceTransactionStatus.paid,
        paymentMethod: FinancePaymentMethod.cash,
        sourceModule: 'caisse',
        sourceType: 'cash_session',
        sourceId: saved.id,
        sourceLabel: `${saved.shiftName ?? 'Journee'} - ${dateOnly(saved.businessDate)}`,
        description: `Cloture caisse - ${saved.shiftName ?? dateOnly(saved.businessDate)}`,
        cashSessionId: saved.id,
        createdById: saved.closedById,
        occurredAt: saved.closedAt ?? new Date()
      });
      await recordFinanceTransaction(tx, {
        type: FinanceTransactionType.cash_difference,
        direction: totals.difference > 0 ? FinanceDirection.in : totals.difference < 0 ? FinanceDirection.out : FinanceDirection.neutral,
        amount: Math.abs(totals.difference),
        status: FinanceTransactionStatus.paid,
        paymentMethod: FinancePaymentMethod.cash,
        sourceModule: 'caisse',
        sourceType: 'cash_session_difference',
        sourceId: saved.id,
        sourceLabel: `${saved.shiftName ?? 'Journee'} - ${dateOnly(saved.businessDate)}`,
        description: `Ecart caisse - ${saved.shiftName ?? dateOnly(saved.businessDate)}`,
        cashSessionId: saved.id,
        createdById: saved.closedById,
        occurredAt: saved.closedAt ?? new Date()
      });
    }

    return saved;
  });

  return mapCashSession(row, totals);
}

export async function deleteCashSession(id: number): Promise<void> {
  const existing = await prisma.cashSession.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, 'Session de caisse introuvable');
  }
  await prisma.cashSession.delete({ where: { id } });
}

export async function listEmployeeProfiles(): Promise<EmployeeProfileSummary[]> {
  const rows = await prisma.employeeProfile.findMany({
    include: {
      user: {
        include: {
          role: true
        }
      }
    },
    orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }, { id: 'asc' }]
  });
  return rows.map(mapEmployeeProfile);
}

function mapPayrollSettings(row: {
  paymentMode: PayrollPaymentMode | string;
  defaultDailyAmount: unknown;
  monthlyDivisor: number;
  allowNegativeBalance: boolean;
  autoDeductAcompte: boolean;
}) {
  return {
    paymentMode: row.paymentMode,
    defaultDailyAmount: Number(row.defaultDailyAmount),
    monthlyDivisor: row.monthlyDivisor,
    allowNegativeBalance: row.allowNegativeBalance,
    autoDeductAcompte: row.autoDeductAcompte
  };
}

export async function getPayrollSettings() {
  const settings = await prisma.payrollSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      paymentMode: PayrollPaymentMode.daily,
      defaultDailyAmount: 0,
      monthlyDivisor: 30,
      allowNegativeBalance: true,
      autoDeductAcompte: true
    }
  });
  return mapPayrollSettings(settings);
}

export async function updatePayrollSettings(payload: {
  paymentMode?: PayrollPaymentMode;
  defaultDailyAmount?: number;
  monthlyDivisor?: number;
  allowNegativeBalance?: boolean;
  autoDeductAcompte?: boolean;
}) {
  const paymentMode = Object.values(PayrollPaymentMode).includes(payload.paymentMode as PayrollPaymentMode)
    ? payload.paymentMode
    : PayrollPaymentMode.daily;
  const settings = await prisma.payrollSettings.upsert({
    where: { id: 1 },
    update: {
      paymentMode,
      defaultDailyAmount: toNonNegativeNumber(payload.defaultDailyAmount ?? 0, 'defaultDailyAmount'),
      monthlyDivisor: Math.max(Number(payload.monthlyDivisor) || 30, 1),
      allowNegativeBalance: payload.allowNegativeBalance ?? true,
      autoDeductAcompte: payload.autoDeductAcompte ?? true
    },
    create: {
      id: 1,
      paymentMode,
      defaultDailyAmount: toNonNegativeNumber(payload.defaultDailyAmount ?? 0, 'defaultDailyAmount'),
      monthlyDivisor: Math.max(Number(payload.monthlyDivisor) || 30, 1),
      allowNegativeBalance: payload.allowNegativeBalance ?? true,
      autoDeductAcompte: payload.autoDeductAcompte ?? true
    }
  });
  return mapPayrollSettings(settings);
}

function accountTransactionImpact(type: EmployeeAccountTransactionType, amount: number) {
  if (type === EmployeeAccountTransactionType.payment || type === EmployeeAccountTransactionType.bonus) return amount;
  return -amount;
}

function calculateWorkerDue(employee: { employmentType: string; baseSalary: unknown }, settings: { paymentMode: string; defaultDailyAmount: number; monthlyDivisor: number }) {
  const baseSalary = Number(employee.baseSalary);
  if (settings.paymentMode === PayrollPaymentMode.daily) {
    if (employee.employmentType === 'daily') return baseSalary;
    return settings.defaultDailyAmount > 0 ? settings.defaultDailyAmount : baseSalary / Math.max(settings.monthlyDivisor, 1);
  }
  if (settings.paymentMode === PayrollPaymentMode.weekly) {
    const daily = settings.defaultDailyAmount > 0 ? settings.defaultDailyAmount : baseSalary / Math.max(settings.monthlyDivisor, 1);
    return employee.employmentType === 'daily' ? baseSalary * 7 : daily * 7;
  }
  return baseSalary;
}

export async function listEmployeeAccountSummaries() {
  const [settings, employees] = await Promise.all([
    getPayrollSettings(),
    prisma.employeeProfile.findMany({
      include: {
        user: {
          include: { role: true }
        },
        accountTransactions: {
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }]
        }
      },
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }, { id: 'asc' }]
    })
  ]);

  return employees.map((employee) => {
    const fullName = employeeDisplayName(employee);
    const transactions = employee.accountTransactions.map((transaction) => ({
      id: transaction.id,
      employeeId: transaction.employeeId,
      employeeName: fullName,
      type: transaction.type,
      amount: Number(transaction.amount),
      impact: accountTransactionImpact(transaction.type, Number(transaction.amount)),
      label: transaction.label,
      note: transaction.note,
      occurredAt: transaction.occurredAt.toISOString(),
      createdAt: transaction.createdAt.toISOString()
    }));
    const dueAmount = calculateWorkerDue(employee, settings);
    const accountBalance = transactions.reduce((sum, transaction) => sum + transaction.impact, dueAmount);
    const acompteTotal = transactions.filter((transaction) => transaction.type === EmployeeAccountTransactionType.acompte).reduce((sum, transaction) => sum + transaction.amount, 0);
    const deductionTotal = transactions
      .filter((transaction) => transaction.type === EmployeeAccountTransactionType.personal_deduction || transaction.type === EmployeeAccountTransactionType.lost_deduction)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const paidTotal = transactions.filter((transaction) => transaction.type === EmployeeAccountTransactionType.payment).reduce((sum, transaction) => sum + transaction.amount, 0);
    const bonusTotal = transactions.filter((transaction) => transaction.type === EmployeeAccountTransactionType.bonus).reduce((sum, transaction) => sum + transaction.amount, 0);
    return {
      employeeId: employee.id,
      userId: employee.userId,
      fullName,
      roleName: employee.user?.role.name ?? 'Employe',
      position: employee.position,
      employmentType: employee.employmentType,
      baseSalary: Number(employee.baseSalary),
      isActive: employee.isActive,
      dueAmount,
      accountBalance,
      finalPayment: Math.max(accountBalance, 0),
      acompteTotal,
      deductionTotal,
      paidTotal,
      bonusTotal,
      lastTransactionAt: transactions[0]?.occurredAt ?? null,
      transactions
    };
  });
}

export async function createEmployeeAccountTransaction(payload: {
  employeeId: number;
  type: EmployeeAccountTransactionType;
  amount: number;
  label?: string | null;
  note?: string | null;
  occurredAt?: string | null;
}) {
  requireField(payload, 'employeeId');
  const employee = await prisma.employeeProfile.findUnique({
    where: { id: Number(payload.employeeId) },
    include: { user: true }
  });
  if (!employee) {
    throw new HttpError(404, 'Employe introuvable');
  }
  const fullName = employeeDisplayName(employee);
  const type = Object.values(EmployeeAccountTransactionType).includes(payload.type)
    ? payload.type
    : EmployeeAccountTransactionType.acompte;
  const amount = toPositiveNumber(payload.amount, 'amount');
  const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
  const label = payload.label?.trim() || (
    type === EmployeeAccountTransactionType.acompte
      ? 'A compte'
      : type === EmployeeAccountTransactionType.lost_deduction
        ? 'Perdu'
        : type === EmployeeAccountTransactionType.personal_deduction
          ? 'Retenue personnelle'
          : type === EmployeeAccountTransactionType.payment
            ? 'Paiement'
            : 'Prime'
  );

  const created = await prisma.$transaction(async (tx) => {
    const transaction = await tx.employeeAccountTransaction.create({
      data: {
        employeeId: employee.id,
        type,
        amount,
        label,
        note: payload.note ? String(payload.note).trim() : null,
        occurredAt
      }
    });

    if (type === EmployeeAccountTransactionType.acompte || type === EmployeeAccountTransactionType.payment) {
      await upsertLinkedExpense(tx, {
        sourceType: type === EmployeeAccountTransactionType.acompte ? ExpenseSourceType.employee_account_acompte : ExpenseSourceType.employee_account_payment,
        sourceId: transaction.id,
        sourceLabel: fullName,
        amount,
        category: type === EmployeeAccountTransactionType.acompte ? systemExpenseCategories.salaryAdvance : systemExpenseCategories.payrollPayment,
        type: ExpenseType.variable,
        status: ExpenseStatus.paid,
        paymentMethod: FinancePaymentMethod.cash,
        supplierName: fullName,
        description: `${label} - ${fullName}`,
        date: occurredAt,
        paidAt: occurredAt
      });
    } else {
      await recordFinanceTransaction(tx, {
        type: type === EmployeeAccountTransactionType.bonus ? FinanceTransactionType.payroll_adjustment : FinanceTransactionType.payroll_adjustment,
        direction: FinanceDirection.neutral,
        amount,
        status: FinanceTransactionStatus.paid,
        paymentMethod: null,
        sourceModule: 'payroll',
        sourceType: type,
        sourceId: transaction.id,
        sourceLabel: fullName,
        description: `${label} - ${fullName}`,
        employeeId: employee.id,
        occurredAt
      });
    }

    return transaction;
  });

  return created;
}

export async function bulkCreateEmployeeAccountTransactions(payload: {
  employeeIds: number[];
  type: EmployeeAccountTransactionType;
  amount?: number | null;
  label?: string | null;
  note?: string | null;
  occurredAt?: string | null;
}) {
  const ids = Array.isArray(payload.employeeIds) ? [...new Set(payload.employeeIds.map(Number).filter(Boolean))] : [];
  if (ids.length === 0) {
    throw new HttpError(400, 'Selection employe requise');
  }

  if (payload.type === EmployeeAccountTransactionType.payment && (!payload.amount || payload.amount <= 0)) {
    const accounts = await listEmployeeAccountSummaries();
    const selectedAccounts = accounts.filter((account) => ids.includes(account.employeeId));
    for (const account of selectedAccounts) {
      if (account.finalPayment > 0) {
        await createEmployeeAccountTransaction({
          employeeId: account.employeeId,
          type: EmployeeAccountTransactionType.payment,
          amount: account.finalPayment,
          label: payload.label ?? 'Paiement groupé',
          note: payload.note,
          occurredAt: payload.occurredAt
        });
      }
    }
    return listEmployeeAccountSummaries();
  }

  const amount = toPositiveNumber(payload.amount ?? 0, 'amount');
  for (const employeeId of ids) {
    await createEmployeeAccountTransaction({
      employeeId,
      type: payload.type,
      amount,
      label: payload.label,
      note: payload.note,
      occurredAt: payload.occurredAt
    });
  }

  return listEmployeeAccountSummaries();
}

export async function upsertEmployeeProfile(payload: {
  id?: number;
  userId?: number | null;
  fullName?: string | null;
  position?: string | null;
  employmentType: EmployeeProfileSummary['employmentType'];
  baseSalary: number;
  hireDate?: string | null;
  isActive: boolean;
  payrollNotes?: string | null;
}): Promise<EmployeeProfileSummary> {
  const userId = payload.userId ? Number(payload.userId) : null;
  const user = userId
    ? await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    })
    : null;
  if (userId && !user) {
    throw new HttpError(404, 'Utilisateur introuvable');
  }
  const fullName = user?.fullName ?? String(payload.fullName ?? '').trim();
  if (!fullName) {
    throw new HttpError(400, 'Nom employe requis');
  }

  const data = {
    userId: user?.id ?? null,
    fullName,
    position: payload.position ? String(payload.position).trim() : user?.role.name ?? null,
    employmentType: payload.employmentType,
    baseSalary: toNonNegativeNumber(payload.baseSalary, 'baseSalary'),
    hireDate: payload.hireDate ? new Date(payload.hireDate) : null,
    isActive: Boolean(payload.isActive),
    payrollNotes: payload.payrollNotes ? String(payload.payrollNotes).trim() : null
  };

  const profile = payload.id
    ? await prisma.employeeProfile.update({
      where: { id: Number(payload.id) },
      data,
      include: {
        user: {
          include: { role: true }
        }
      }
    })
    : user
      ? await prisma.employeeProfile.upsert({
        where: { userId: user.id },
        update: data,
        create: data,
        include: {
          user: {
            include: { role: true }
          }
        }
      })
      : await prisma.employeeProfile.create({
        data,
        include: {
          user: {
            include: { role: true }
          }
        }
      });

  return mapEmployeeProfile(profile);
}

export async function listSalaryAdvances(): Promise<SalaryAdvanceSummary[]> {
  const rows = await prisma.salaryAdvance.findMany({
    include: {
      employee: {
        include: {
          user: true
        }
      }
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }]
  });
  return rows.map(mapAdvance);
}

export async function createSalaryAdvance(payload: {
  employeeId: number;
  amount: number;
  reason: string;
  method?: FinancePaymentMethod;
  note?: string | null;
  date?: string | null;
}): Promise<SalaryAdvanceSummary> {
  requireField(payload, 'employeeId');
  requireField(payload, 'reason');
  const employee = await prisma.employeeProfile.findUnique({
    where: { id: Number(payload.employeeId) },
    include: { user: true }
  });
  if (!employee) {
    throw new HttpError(404, 'Employe introuvable');
  }

  const amount = toPositiveNumber(payload.amount, 'amount');
  const date = payload.date ? new Date(payload.date) : new Date();
  const fullName = employeeDisplayName(employee);

  const created = await prisma.$transaction(async (tx) => {
    const advance = await tx.salaryAdvance.create({
      data: {
        employeeId: employee.id,
        amount,
        remainingAmount: amount,
        reason: String(payload.reason).trim(),
        note: payload.note ? String(payload.note).trim() : null,
        date
      },
      include: {
        employee: {
          include: {
            user: true
          }
        }
      }
    });

    await upsertLinkedExpense(tx, {
      sourceType: ExpenseSourceType.salary_advance,
      sourceId: advance.id,
      sourceLabel: fullName,
      amount,
      category: systemExpenseCategories.salaryAdvance,
      type: ExpenseType.variable,
      status: ExpenseStatus.paid,
      paymentMethod: payload.method ?? FinancePaymentMethod.cash,
      supplierName: fullName,
      description: `Avance salaire - ${fullName} - ${String(payload.reason).trim()}`,
      date,
      paidAt: date
    });

    return advance;
  });

  return mapAdvance(created);
}

function mapPayrollPeriod(row: {
  id: number;
  label: string;
  startDate: Date;
  endDate: Date;
  status: string;
  notes: string | null;
  entries: Array<{
    id: number;
    employeeId: number;
    baseSalary: unknown;
    bonuses: unknown;
    deductions: unknown;
    advanceDeduction: unknown;
    netSalary: unknown;
    notes: string | null;
    employee: {
      fullName: string | null;
      position: string | null;
      user?: { fullName: string } | null;
    };
    payments: Array<{
      id: number;
      amount: unknown;
      method: string;
      paidAt: Date;
      note: string | null;
    }>;
  }>;
  adjustments: Array<{
    id: number;
    employeeId: number;
    periodId: number | null;
    type: string;
    amount: unknown;
    reason: string;
    note: string | null;
    date: Date;
    employee: { fullName: string | null; user?: { fullName: string } | null };
    period?: { label: string } | null;
  }>;
}): PayrollPeriodSummary {
  const adjustmentsByEmployee = new Map<number, PayrollAdjustmentSummary[]>();
  for (const adjustment of row.adjustments ?? []) {
    const mapped = mapPayrollAdjustment(adjustment);
    adjustmentsByEmployee.set(adjustment.employeeId, [...(adjustmentsByEmployee.get(adjustment.employeeId) ?? []), mapped]);
  }
  const entries = row.entries.map((entry) => {
    const netSalary = Number(entry.netSalary);
    const paidAmount = entry.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    return {
      id: entry.id,
      employeeId: entry.employeeId,
      employeeName: employeeDisplayName(entry.employee),
      position: entry.employee.position,
      baseSalary: Number(entry.baseSalary),
      bonuses: Number(entry.bonuses),
      deductions: Number(entry.deductions),
      advanceDeduction: Number(entry.advanceDeduction),
      netSalary,
      paidAmount,
      remainingAmount: Math.max(netSalary - paidAmount, 0),
      paymentStatus: computePaymentStatus(netSalary, paidAmount),
      notes: entry.notes,
      adjustments: adjustmentsByEmployee.get(entry.employeeId) ?? [],
      payments: entry.payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        method: payment.method as PayrollPeriodSummary['entries'][number]['payments'][number]['method'],
        paidAt: payment.paidAt.toISOString(),
        note: payment.note
      }))
    };
  });

  const payrollTotal = entries.reduce((sum, entry) => sum + entry.netSalary, 0);
  const paidTotal = entries.reduce((sum, entry) => sum + entry.paidAmount, 0);
  const adjustmentsTotal = row.adjustments.reduce((sum, adjustment) => sum + Number(adjustment.amount), 0);

  return {
    id: row.id,
    label: row.label,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    status: row.status as PayrollPeriodSummary['status'],
    notes: row.notes,
    payrollTotal,
    paidTotal,
    remainingTotal: Math.max(payrollTotal - paidTotal, 0),
    adjustmentsTotal,
    entries
  };
}

export async function listPayrollPeriods(): Promise<PayrollPeriodSummary[]> {
  const rows = await prisma.payrollPeriod.findMany({
    include: {
      entries: {
        include: {
          employee: {
            include: {
              user: true
            }
          },
          payments: {
            orderBy: { paidAt: 'desc' }
          }
        },
        orderBy: {
          employee: {
            user: {
              fullName: 'asc'
            }
          }
        }
      },
      adjustments: {
        include: {
          employee: {
            include: {
              user: true
            }
          },
          period: true
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }]
      }
    },
    orderBy: [{ endDate: 'desc' }, { id: 'desc' }]
  });

  return rows.map(mapPayrollPeriod);
}

export async function createPayrollPeriod(payload: {
  label: string;
  startDate: string;
  endDate: string;
  notes?: string | null;
}): Promise<PayrollPeriodSummary> {
  requireField(payload, 'label');
  requireField(payload, 'startDate');
  requireField(payload, 'endDate');

  const startDate = new Date(payload.startDate);
  const endDate = new Date(payload.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    throw new HttpError(400, 'Periode de paie invalide');
  }

  const employees = await prisma.employeeProfile.findMany({
    where: { isActive: true },
    include: {
      user: true
    }
  });

  const created = await prisma.$transaction(async (tx) => {
    const period = await tx.payrollPeriod.create({
      data: {
        label: String(payload.label).trim(),
        startDate,
        endDate,
        notes: payload.notes ? String(payload.notes).trim() : null
      }
    });

    if (employees.length > 0) {
      const adjustments = await tx.payrollAdjustment.findMany({
        where: {
          periodId: null,
          date: { gte: startDate, lte: endDate },
          employeeId: { in: employees.map((employee) => employee.id) }
        }
      });
      const deductionsByEmployee = new Map<number, number>();
      for (const adjustment of adjustments) {
        deductionsByEmployee.set(
          adjustment.employeeId,
          (deductionsByEmployee.get(adjustment.employeeId) ?? 0) + Number(adjustment.amount)
        );
      }

      await tx.payrollEntry.createMany({
        data: employees.map((employee) => ({
          periodId: period.id,
          employeeId: employee.id,
          baseSalary: employee.baseSalary,
          bonuses: 0,
          deductions: deductionsByEmployee.get(employee.id) ?? 0,
          advanceDeduction: 0,
          netSalary: Math.max(Number(employee.baseSalary) - (deductionsByEmployee.get(employee.id) ?? 0), 0),
          notes: null
        }))
      });

      if (adjustments.length > 0) {
        await tx.payrollAdjustment.updateMany({
          where: { id: { in: adjustments.map((adjustment) => adjustment.id) } },
          data: { periodId: period.id }
        });
      }
    }

    return tx.payrollPeriod.findUniqueOrThrow({
      where: { id: period.id },
      include: {
        entries: {
          include: {
            employee: {
              include: {
                user: true
              }
            },
            payments: true
          }
        },
        adjustments: {
          include: {
            employee: {
              include: {
                user: true
              }
            },
            period: true
          }
        }
      }
    });
  });

  return mapPayrollPeriod(created);
}

async function restoreEntryAdvanceSettlements(tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>, entryId: number) {
  const previousSettlements = await tx.salaryAdvanceSettlement.findMany({
    where: { entryId }
  });
  for (const settlement of previousSettlements) {
    await tx.salaryAdvance.update({
      where: { id: settlement.advanceId },
      data: {
        remainingAmount: {
          increment: settlement.amount
        }
      }
    });
  }
  if (previousSettlements.length > 0) {
    await tx.salaryAdvanceSettlement.deleteMany({ where: { entryId } });
  }
}

async function recalculatePayrollEntry(tx: Prisma.TransactionClient, entryId: number) {
  const entry = await tx.payrollEntry.findUnique({ where: { id: entryId } });
  if (!entry) return;
  const netSalary = Math.max(
    Number(entry.baseSalary) + Number(entry.bonuses) - Number(entry.deductions) - Number(entry.advanceDeduction),
    0
  );
  const payments = await tx.payrollPayment.findMany({ where: { entryId } });
  const paidAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  if (paidAmount - netSalary > 0.001) {
    throw new HttpError(400, 'La retenue rendrait la ligne inferieure au montant deja paye');
  }
  await tx.payrollEntry.update({
    where: { id: entryId },
    data: { netSalary }
  });
}

export async function listPayrollAdjustments(): Promise<PayrollAdjustmentSummary[]> {
  const rows = await prisma.payrollAdjustment.findMany({
    include: {
      employee: {
        include: {
          user: true
        }
      },
      period: true
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }]
  });
  return rows.map(mapPayrollAdjustment);
}

export async function createPayrollAdjustment(payload: {
  employeeId: number;
  periodId?: number | null;
  type: PayrollAdjustmentSummary['type'];
  amount: number;
  reason: string;
  note?: string | null;
  date?: string | null;
}): Promise<PayrollAdjustmentSummary> {
  requireField(payload, 'employeeId');
  requireField(payload, 'reason');
  const amount = toPositiveNumber(payload.amount, 'amount');
  const employee = await prisma.employeeProfile.findUnique({
    where: { id: Number(payload.employeeId) },
    include: {
      user: true
    }
  });
  if (!employee) {
    throw new HttpError(404, 'Employe introuvable');
  }
  const fullName = employeeDisplayName(employee);

  const periodId = payload.periodId ? Number(payload.periodId) : null;
  if (periodId) {
    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) {
      throw new HttpError(404, 'Periode de paie introuvable');
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const adjustment = await tx.payrollAdjustment.create({
      data: {
        employeeId: employee.id,
        periodId,
        type: payload.type === PayrollAdjustmentType.penalty ? PayrollAdjustmentType.penalty : PayrollAdjustmentType.deduction,
        amount,
        reason: String(payload.reason).trim(),
        note: payload.note ? String(payload.note).trim() : null,
        date: payload.date ? new Date(payload.date) : new Date()
      },
      include: {
        employee: {
          include: {
            user: true
          }
        },
        period: true
      }
    });

    if (periodId) {
      const entry = await tx.payrollEntry.findUnique({
        where: {
          periodId_employeeId: {
            periodId,
            employeeId: employee.id
          }
        }
      });
      if (entry) {
        await tx.payrollEntry.update({
          where: { id: entry.id },
          data: {
            deductions: {
              increment: amount
            }
          }
        });
        await recalculatePayrollEntry(tx, entry.id);
      }
    }

    await recordFinanceTransaction(tx, {
      type: FinanceTransactionType.payroll_adjustment,
      direction: FinanceDirection.neutral,
      amount,
      status: FinanceTransactionStatus.paid,
      paymentMethod: null,
      sourceModule: 'payroll',
      sourceType: adjustment.type,
      sourceId: adjustment.id,
      sourceLabel: fullName,
      description: `${adjustment.type === PayrollAdjustmentType.penalty ? 'Penalite' : 'Retenue'} - ${String(payload.reason).trim()}`,
      employeeId: employee.id,
      occurredAt: adjustment.date
    });

    return adjustment;
  });

  return mapPayrollAdjustment(created);
}

export async function deletePayrollAdjustment(id: number): Promise<void> {
  const existing = await prisma.payrollAdjustment.findUnique({
    where: { id },
    include: { period: true }
  });
  if (!existing) {
    throw new HttpError(404, 'Retenue introuvable');
  }

  await prisma.$transaction(async (tx) => {
    if (existing.periodId) {
      const entry = await tx.payrollEntry.findUnique({
        where: {
          periodId_employeeId: {
            periodId: existing.periodId,
            employeeId: existing.employeeId
          }
        }
      });
      if (entry) {
        await tx.payrollEntry.update({
          where: { id: entry.id },
          data: {
            deductions: Math.max(Number(entry.deductions) - Number(existing.amount), 0)
          }
        });
        await recalculatePayrollEntry(tx, entry.id);
      }
    }
    await cancelFinanceTransactionBySource(tx, {
      type: FinanceTransactionType.payroll_adjustment,
      sourceModule: 'payroll',
      sourceId: id
    });
    await tx.payrollAdjustment.delete({ where: { id } });
  });
}

export async function updatePayrollEntry(
  entryId: number,
  payload: {
    baseSalary: number;
    bonuses: number;
    deductions: number;
    advanceDeduction: number;
    notes?: string | null;
  }
): Promise<PayrollPeriodSummary> {
  const entry = await prisma.payrollEntry.findUnique({
    where: { id: entryId },
    include: {
      employee: true
    }
  });
  if (!entry) {
    throw new HttpError(404, 'Ligne de paie introuvable');
  }

  const baseSalary = toNonNegativeNumber(payload.baseSalary, 'baseSalary');
  const bonuses = toNonNegativeNumber(payload.bonuses, 'bonuses');
  const deductions = toNonNegativeNumber(payload.deductions, 'deductions');
  const advanceDeduction = toNonNegativeNumber(payload.advanceDeduction, 'advanceDeduction');
  const grossAvailable = baseSalary + bonuses - deductions;
  if (advanceDeduction > grossAvailable) {
    throw new HttpError(400, 'La retenue sur avance depasse le disponible');
  }
  const paidAmount = await prisma.payrollPayment
    .findMany({ where: { entryId } })
    .then((payments) => payments.reduce((sum, payment) => sum + Number(payment.amount), 0));
  if (paidAmount - (grossAvailable - advanceDeduction) > 0.001) {
    throw new HttpError(400, 'La ligne est deja payee au-dessus du nouveau net');
  }

  await prisma.$transaction(async (tx) => {
    await restoreEntryAdvanceSettlements(tx, entryId);

    const advances = await tx.salaryAdvance.findMany({
      where: {
        employeeId: entry.employeeId,
        remainingAmount: { gt: 0 }
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }]
    });

    let remainingToAllocate = advanceDeduction;
    for (const advance of advances) {
      if (remainingToAllocate <= 0) break;
      const allocated = Math.min(Number(advance.remainingAmount), remainingToAllocate);
      await tx.salaryAdvanceSettlement.create({
        data: {
          advanceId: advance.id,
          entryId,
          amount: allocated
        }
      });
      await tx.salaryAdvance.update({
        where: { id: advance.id },
        data: {
          remainingAmount: {
            decrement: allocated
          }
        }
      });
      remainingToAllocate -= allocated;
    }

    if (remainingToAllocate > 0.001) {
      throw new HttpError(400, 'Le montant des avances a deduire depasse les avances disponibles');
    }

    await tx.payrollEntry.update({
      where: { id: entryId },
      data: {
        baseSalary,
        bonuses,
        deductions,
        advanceDeduction,
        netSalary: grossAvailable - advanceDeduction,
        notes: payload.notes ? String(payload.notes).trim() : null
      }
    });
  });

  const refreshed = await prisma.payrollEntry.findUnique({
    where: { id: entryId },
    select: { periodId: true }
  });
  if (!refreshed) {
    throw new HttpError(404, 'Periode de paie introuvable');
  }
  return getPayrollPeriod(refreshed.periodId);
}

export async function createPayrollPayment(
  entryId: number,
  payload: {
    amount: number;
    method: FinancePaymentMethod;
    paidAt?: string | null;
    note?: string | null;
  }
): Promise<PayrollPeriodSummary> {
  const entry = await prisma.payrollEntry.findUnique({
    where: { id: entryId },
    include: {
      payments: true,
      employee: {
        include: {
          user: true
        }
      },
      period: true
    }
  });
  if (!entry) {
    throw new HttpError(404, 'Ligne de paie introuvable');
  }

  const amount = toPositiveNumber(payload.amount, 'amount');
  const paidAmount = entry.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const remaining = Number(entry.netSalary) - paidAmount;
  if (amount - remaining > 0.001) {
    throw new HttpError(400, 'Le paiement depasse le restant a payer');
  }

  const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date();
  const fullName = employeeDisplayName(entry.employee);

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payrollPayment.create({
      data: {
        entryId,
        amount,
        method: payload.method ?? FinancePaymentMethod.cash,
        paidAt,
        note: payload.note ? String(payload.note).trim() : null
      }
    });

    await upsertLinkedExpense(tx, {
      sourceType: ExpenseSourceType.payroll_payment,
      sourceId: payment.id,
      sourceLabel: fullName,
      amount,
      category: systemExpenseCategories.payrollPayment,
      type: ExpenseType.variable,
      status: ExpenseStatus.paid,
      paymentMethod: payload.method ?? FinancePaymentMethod.cash,
      supplierName: fullName,
      description: `Paiement salaire - ${fullName} - ${entry.period.label}`,
      date: paidAt,
      paidAt
    });
  });

  return getPayrollPeriod(entry.periodId);
}

function monthBounds(value: Date) {
  const startDate = new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
  const endDate = new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}

function payrollMonthLabel(value: Date) {
  return `Paie ${value.toLocaleDateString('fr-DZ', { month: 'long', year: 'numeric' })}`;
}

async function allocateAdvanceDeduction(
  tx: Prisma.TransactionClient,
  employeeId: number,
  entryId: number,
  amount: number
) {
  const advances = await tx.salaryAdvance.findMany({
    where: {
      employeeId,
      remainingAmount: { gt: 0 }
    },
    orderBy: [{ date: 'asc' }, { id: 'asc' }]
  });

  let remainingToAllocate = amount;
  for (const advance of advances) {
    if (remainingToAllocate <= 0) break;
    const allocated = Math.min(Number(advance.remainingAmount), remainingToAllocate);
    await tx.salaryAdvanceSettlement.create({
      data: {
        advanceId: advance.id,
        entryId,
        amount: allocated
      }
    });
    await tx.salaryAdvance.update({
      where: { id: advance.id },
      data: {
        remainingAmount: {
          decrement: allocated
        }
      }
    });
    remainingToAllocate -= allocated;
  }
}

export async function createEmployeeAccountPayment(
  employeeId: number,
  payload: {
    paidAt?: string | null;
    note?: string | null;
  }
): Promise<PayrollPeriodSummary> {
  const employee = await prisma.employeeProfile.findUnique({
    where: { id: Number(employeeId) },
    include: { user: true }
  });
  if (!employee) {
    throw new HttpError(404, 'Employe introuvable');
  }

  const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date();
  const fullName = employeeDisplayName(employee);
  const { startDate, endDate } = monthBounds(paidAt);

  const periodId = await prisma.$transaction(async (tx) => {
    let period = await tx.payrollPeriod.findFirst({
      where: {
        startDate,
        endDate
      }
    });

    if (!period) {
      period = await tx.payrollPeriod.create({
        data: {
          label: payrollMonthLabel(paidAt),
          startDate,
          endDate,
          status: PayrollPeriodStatus.validated,
          notes: 'Periode creee automatiquement depuis le compte employe'
        }
      });
    }

    await tx.payrollAdjustment.updateMany({
      where: {
        employeeId: employee.id,
        periodId: null,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      data: {
        periodId: period.id
      }
    });

    const adjustments = await tx.payrollAdjustment.findMany({
      where: {
        employeeId: employee.id,
        periodId: period.id
      }
    });
    const deductions = adjustments.reduce((sum, adjustment) => sum + Number(adjustment.amount), 0);
    const openAdvances = await tx.salaryAdvance.findMany({
      where: {
        employeeId: employee.id,
        remainingAmount: { gt: 0 }
      }
    });
    const advanceBalance = openAdvances.reduce((sum, advance) => sum + Number(advance.remainingAmount), 0);
    const baseSalary = Number(employee.baseSalary);
    const grossAvailable = baseSalary - deductions;
    const advanceDeduction = Math.min(Math.max(grossAvailable, 0), advanceBalance);
    const netSalary = Math.max(grossAvailable - advanceDeduction, 0);

    let entry = await tx.payrollEntry.findUnique({
      where: {
        periodId_employeeId: {
          periodId: period.id,
          employeeId: employee.id
        }
      },
      include: { payments: true }
    });

    if (entry) {
      await restoreEntryAdvanceSettlements(tx, entry.id);
      entry = await tx.payrollEntry.update({
        where: { id: entry.id },
        data: {
          baseSalary,
          deductions,
          advanceDeduction,
          netSalary,
          notes: 'Calcul automatique depuis le compte employe'
        },
        include: { payments: true }
      });
    } else {
      entry = await tx.payrollEntry.create({
        data: {
          periodId: period.id,
          employeeId: employee.id,
          baseSalary,
          bonuses: 0,
          deductions,
          advanceDeduction,
          netSalary,
          notes: 'Calcul automatique depuis le compte employe'
        },
        include: { payments: true }
      });
    }

    await allocateAdvanceDeduction(tx, employee.id, entry.id, advanceDeduction);

    const paidAmount = entry.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const amount = Math.max(netSalary - paidAmount, 0);
    if (amount <= 0) {
      throw new HttpError(400, 'Aucun montant positif a payer pour cet employe');
    }

    const payment = await tx.payrollPayment.create({
      data: {
        entryId: entry.id,
        amount,
        method: FinancePaymentMethod.cash,
        paidAt,
        note: payload.note ? String(payload.note).trim() : 'Paiement final depuis compte employe'
      }
    });

    await upsertLinkedExpense(tx, {
      sourceType: ExpenseSourceType.payroll_payment,
      sourceId: payment.id,
      sourceLabel: fullName,
      amount,
      category: systemExpenseCategories.payrollPayment,
      type: ExpenseType.variable,
      status: ExpenseStatus.paid,
      paymentMethod: FinancePaymentMethod.cash,
      supplierName: fullName,
      description: `Paiement salaire - ${fullName} - ${period.label}`,
      date: paidAt,
      paidAt
    });

    const remainingEntries = await tx.payrollEntry.findMany({
      where: { periodId: period.id },
      include: { payments: true }
    });
    const allPaid = remainingEntries.every((row) => {
      const rowPaid = row.payments.reduce((sum, paymentRow) => sum + Number(paymentRow.amount), 0);
      return Number(row.netSalary) - rowPaid <= 0.001;
    });
    if (allPaid) {
      await tx.payrollPeriod.update({
        where: { id: period.id },
        data: { status: PayrollPeriodStatus.paid }
      });
    }

    return period.id;
  });

  return getPayrollPeriod(periodId);
}

export async function updatePayrollPeriodStatus(periodId: number, status: PayrollPeriodSummary['status']): Promise<PayrollPeriodSummary> {
  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: { status }
  });
  return getPayrollPeriod(periodId);
}

async function getPayrollPeriod(periodId: number): Promise<PayrollPeriodSummary> {
  const row = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: {
      entries: {
        include: {
          employee: {
            include: {
              user: true
            }
          },
          payments: {
            orderBy: { paidAt: 'desc' }
          }
        },
        orderBy: {
          employee: {
            user: {
              fullName: 'asc'
            }
          }
        }
      },
      adjustments: {
        include: {
          employee: {
            include: {
              user: true
            }
          },
          period: true
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }]
      }
    }
  });

  if (!row) {
    throw new HttpError(404, 'Periode de paie introuvable');
  }

  return mapPayrollPeriod(row);
}
