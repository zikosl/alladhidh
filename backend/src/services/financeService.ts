import { ExpenseSourceType, ExpenseStatus, ExpenseType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { systemExpenseCategories, upsertLinkedExpense } from './expenseSyncService';
import {
  EmployeeProfileSummary,
  ExpenseCategorySummary,
  ExpenseSummary,
  PayrollPeriodSummary,
  SalaryAdvanceSummary
} from '../types/pos';
import { HttpError } from '../utils/httpError';
import { requireField, toNonNegativeNumber, toPositiveNumber } from '../utils/validation';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
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
  userId: number;
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
  };
}): EmployeeProfileSummary {
  return {
    id: row.id,
    userId: row.userId,
    fullName: row.user.fullName,
    username: row.user.username,
    roleName: row.user.role.name,
    position: row.position,
    employmentType: row.employmentType as EmployeeProfileSummary['employmentType'],
    baseSalary: Number(row.baseSalary),
    hireDate: toIso(row.hireDate),
    isActive: row.isActive,
    payrollNotes: row.payrollNotes
  };
}

function mapAdvance(row: {
  id: number;
  employeeId: number;
  amount: unknown;
  remainingAmount: unknown;
  reason: string;
  note: string | null;
  date: Date;
  employee: { user: { fullName: string } };
}): SalaryAdvanceSummary {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employee.user.fullName,
    amount: Number(row.amount),
    remainingAmount: Number(row.remainingAmount),
    reason: row.reason,
    note: row.note,
    date: row.date.toISOString()
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
  const created = await prisma.expense.create({
    data: {
      amount: toPositiveNumber(payload.amount, 'amount'),
      category: category.name,
      categoryId: category.id,
      type: payload.type,
      status: payload.status,
      paymentMethod: payload.paymentMethod ?? null,
      supplierName: payload.supplierName ? String(payload.supplierName).trim() : null,
      description: payload.description ? String(payload.description).trim() : null,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      paidAt: payload.paidAt ? new Date(payload.paidAt) : null,
      date: payload.date ? new Date(payload.date) : new Date()
    }
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
  const updated = await prisma.expense.update({
    where: { id },
    data: {
      amount: toPositiveNumber(payload.amount, 'amount'),
      category: category.name,
      categoryId: category.id,
      type: payload.type,
      status: payload.status,
      paymentMethod: payload.paymentMethod ?? null,
      supplierName: payload.supplierName ? String(payload.supplierName).trim() : null,
      description: payload.description ? String(payload.description).trim() : null,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      paidAt: payload.paidAt ? new Date(payload.paidAt) : null,
      date: payload.date ? new Date(payload.date) : existing.date
    }
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
  await prisma.expense.delete({ where: { id } });
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
    orderBy: [{ isActive: 'desc' }, { user: { fullName: 'asc' } }]
  });
  return rows.map(mapEmployeeProfile);
}

export async function upsertEmployeeProfile(payload: {
  userId: number;
  position?: string | null;
  employmentType: EmployeeProfileSummary['employmentType'];
  baseSalary: number;
  hireDate?: string | null;
  isActive: boolean;
  payrollNotes?: string | null;
}): Promise<EmployeeProfileSummary> {
  const user = await prisma.user.findUnique({
    where: { id: Number(payload.userId) },
    include: { role: true }
  });
  if (!user) {
    throw new HttpError(404, 'Utilisateur introuvable');
  }

  const profile = await prisma.employeeProfile.upsert({
    where: { userId: user.id },
    update: {
      position: payload.position ? String(payload.position).trim() : null,
      employmentType: payload.employmentType,
      baseSalary: toNonNegativeNumber(payload.baseSalary, 'baseSalary'),
      hireDate: payload.hireDate ? new Date(payload.hireDate) : null,
      isActive: Boolean(payload.isActive),
      payrollNotes: payload.payrollNotes ? String(payload.payrollNotes).trim() : null
    },
    create: {
      userId: user.id,
      position: payload.position ? String(payload.position).trim() : user.role.name,
      employmentType: payload.employmentType,
      baseSalary: toNonNegativeNumber(payload.baseSalary, 'baseSalary'),
      hireDate: payload.hireDate ? new Date(payload.hireDate) : null,
      isActive: Boolean(payload.isActive),
      payrollNotes: payload.payrollNotes ? String(payload.payrollNotes).trim() : null
    },
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
  method?: 'cash' | 'card' | 'transfer';
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
      sourceLabel: employee.user.fullName,
      amount,
      category: systemExpenseCategories.salaryAdvance,
      type: ExpenseType.variable,
      status: ExpenseStatus.paid,
      paymentMethod: payload.method ?? 'cash',
      supplierName: employee.user.fullName,
      description: `Avance salaire - ${employee.user.fullName} - ${String(payload.reason).trim()}`,
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
      position: string | null;
      user: { fullName: string };
    };
    payments: Array<{
      id: number;
      amount: unknown;
      method: string;
      paidAt: Date;
      note: string | null;
    }>;
  }>;
}): PayrollPeriodSummary {
  const entries = row.entries.map((entry) => {
    const netSalary = Number(entry.netSalary);
    const paidAmount = entry.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    return {
      id: entry.id,
      employeeId: entry.employeeId,
      employeeName: entry.employee.user.fullName,
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
      await tx.payrollEntry.createMany({
        data: employees.map((employee) => ({
          periodId: period.id,
          employeeId: employee.id,
          baseSalary: employee.baseSalary,
          bonuses: 0,
          deductions: 0,
          advanceDeduction: 0,
          netSalary: employee.baseSalary,
          notes: null
        }))
      });
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
    method: 'cash' | 'card' | 'transfer';
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

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payrollPayment.create({
      data: {
        entryId,
        amount,
        method: payload.method,
        paidAt,
        note: payload.note ? String(payload.note).trim() : null
      }
    });

    await upsertLinkedExpense(tx, {
      sourceType: ExpenseSourceType.payroll_payment,
      sourceId: payment.id,
      sourceLabel: entry.employee.user.fullName,
      amount,
      category: systemExpenseCategories.payrollPayment,
      type: ExpenseType.variable,
      status: ExpenseStatus.paid,
      paymentMethod: payload.method,
      supplierName: entry.employee.user.fullName,
      description: `Paiement salaire - ${entry.employee.user.fullName} - ${entry.period.label}`,
      date: paidAt,
      paidAt
    });
  });

  return getPayrollPeriod(entry.periodId);
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
      }
    }
  });

  if (!row) {
    throw new HttpError(404, 'Periode de paie introuvable');
  }

  return mapPayrollPeriod(row);
}
