import { ExpenseSourceType, ExpenseStatus, ExpenseType, FinanceDirection, FinancePaymentMethod, FinanceTransactionType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { recordFinanceTransaction, transactionStatusFromExpense } from './financeLedgerService';

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

export const systemExpenseCategories = {
  stockPurchase: {
    name: 'Achat stock',
    description: 'Achats de matieres premieres lies aux entrees stock'
  },
  payrollPayment: {
    name: 'Salaires',
    description: 'Paiements des salaires du personnel'
  },
  salaryAdvance: {
    name: 'Avances salaires',
    description: 'Avances versees au personnel'
  }
} as const;

async function ensureSystemExpenseCategory(
  client: PrismaClientLike,
  category: { name: string; description: string }
) {
  return client.expenseCategory.upsert({
    where: { name: category.name },
    update: {
      description: category.description,
      isSystem: true
    },
    create: {
      name: category.name,
      description: category.description,
      isSystem: true
    }
  });
}

export async function upsertLinkedExpense(
  client: PrismaClientLike,
  payload: {
    sourceType: ExpenseSourceType;
    sourceId: number;
    sourceLabel: string;
    amount: number;
    category: { name: string; description: string };
    type?: ExpenseType;
    status?: ExpenseStatus;
    paymentMethod?: FinancePaymentMethod | null;
    supplierName?: string | null;
    description?: string | null;
    date?: Date;
    paidAt?: Date | null;
  }
) {
  if (payload.amount <= 0) {
    return null;
  }

  const category = await ensureSystemExpenseCategory(client, payload.category);
  const status = payload.status ?? ExpenseStatus.paid;
  const date = payload.date ?? new Date();
  const paidAt = payload.paidAt ?? (status === ExpenseStatus.paid ? date : null);
  const existing = await client.expense.findFirst({
    where: {
      sourceType: payload.sourceType,
      sourceId: payload.sourceId
    }
  });

  const data = {
    amount: payload.amount,
    category: category.name,
    categoryId: category.id,
    type: payload.type ?? ExpenseType.variable,
    status,
    paymentMethod: payload.paymentMethod ?? null,
    supplierName: payload.supplierName ? String(payload.supplierName).trim() : null,
    description: payload.description ? String(payload.description).trim() : null,
    sourceType: payload.sourceType,
    sourceId: payload.sourceId,
    sourceLabel: payload.sourceLabel,
    dueDate: null,
    paidAt,
    date
  };

  const expense = existing
    ? await client.expense.update({
      where: { id: existing.id },
      data
    })
    : await client.expense.create({
      data
    });

  await recordFinanceTransaction(client, {
    type:
      payload.sourceType === ExpenseSourceType.payroll_payment || payload.sourceType === ExpenseSourceType.employee_account_payment
        ? FinanceTransactionType.payroll_payment
        : payload.sourceType === ExpenseSourceType.salary_advance || payload.sourceType === ExpenseSourceType.employee_account_acompte
          ? FinanceTransactionType.salary_advance
          : FinanceTransactionType.stock_purchase,
    direction: FinanceDirection.out,
    amount: payload.amount,
    status: transactionStatusFromExpense(status),
    paymentMethod: payload.paymentMethod ?? null,
    sourceModule:
      payload.sourceType === ExpenseSourceType.stock_purchase
        ? 'stock'
        : payload.sourceType === ExpenseSourceType.salary_advance
          ? 'payroll'
          : 'payroll',
    sourceType: payload.sourceType,
    sourceId: payload.sourceId,
    sourceLabel: payload.sourceLabel,
    description: payload.description,
    expenseId: expense.id,
    occurredAt: date
  });

  return expense;
}
