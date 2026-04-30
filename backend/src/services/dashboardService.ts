import { ExpenseSourceType } from '@prisma/client';
import { DeliveryStatus, OrderStatus, OrderType, ReportFilters } from '../types/pos';
import { prisma } from '../lib/prisma';

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

function endOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

function resolveRange(filters?: Partial<ReportFilters>) {
  const now = new Date();
  const period = filters?.period ?? '7d';

  if (period === 'today') {
    const start = startOfDay(now);
    const end = endOfDay(now);
    return { period, start, end };
  }

  if (period === '30d') {
    const end = endOfDay(now);
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
    return { period, start, end };
  }

  if (period === 'custom' && filters?.dateFrom && filters?.dateTo) {
    const start = startOfDay(new Date(filters.dateFrom));
    const end = endOfDay(new Date(filters.dateTo));
    return { period, start, end };
  }

  const end = endOfDay(now);
  const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
  return { period: '7d' as const, start, end };
}

function previousRange(start: Date, end: Date) {
  const spanMs = end.getTime() - start.getTime() + 1;
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - spanMs + 1);
  return { start: prevStart, end: prevEnd };
}

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0);
}

export async function getDashboardData(filters?: Partial<ReportFilters>) {
  const range = resolveRange(filters);
  const previous = previousRange(range.start, range.end);
  const lowStockThreshold = Number(process.env.LOW_STOCK_THRESHOLD ?? 1000);

  const [
    sales,
    previousSales,
    expenses,
    previousExpenses,
    ingredients,
    stockMovements,
    payrollPeriods,
    previousPayrollPeriods,
    payrollPayments,
    previousPayrollPayments,
    salePayments,
    previousSalePayments
  ] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: range.start, lte: range.end } },
      include: { saleItems: { include: { product: true } } },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: previous.start, lte: previous.end } },
      include: { saleItems: { include: { product: true } } }
    }),
    prisma.expense.findMany({
      where: { date: { gte: range.start, lte: range.end } }
    }),
    prisma.expense.findMany({
      where: { date: { gte: previous.start, lte: previous.end } }
    }),
    prisma.ingredient.findMany(),
    prisma.stockMovement.findMany({
      where: {
        OR: [{ date: { gte: previous.start, lte: range.end } }, {}]
      }
    }),
    prisma.payrollPeriod.findMany({
      where: { endDate: { gte: range.start, lte: range.end } },
      include: {
        entries: {
          include: {
            employee: {
              include: {
                user: true
              }
            }
          }
        }
      }
    }),
    prisma.payrollPeriod.findMany({
      where: { endDate: { gte: previous.start, lte: previous.end } },
      include: {
        entries: true
      }
    }),
    prisma.payrollPayment.findMany({
      where: { paidAt: { gte: range.start, lte: range.end } },
      include: {
        entry: {
          include: {
            employee: {
              include: {
                user: true
              }
            }
          }
        }
      }
    }),
    prisma.payrollPayment.findMany({
      where: { paidAt: { gte: previous.start, lte: previous.end } },
      include: {
        entry: true
      }
    }),
    prisma.payment.findMany({
      where: { createdAt: { gte: range.start, lte: range.end } }
    }),
    prisma.payment.findMany({
      where: { createdAt: { gte: previous.start, lte: previous.end } }
    })
  ]);

  const nonCancelledSales = sales.filter((sale) => sale.status !== 'cancelled');
  const previousNonCancelledSales = previousSales.filter((sale) => sale.status !== 'cancelled');
  const totalSalesCurrent = sum(nonCancelledSales.map((sale) => Number(sale.totalPrice)));
  const totalSalesPrevious = sum(previousNonCancelledSales.map((sale) => Number(sale.totalPrice)));
  const activeExpenses = expenses.filter((expense) => expense.status !== 'cancelled');
  const previousActiveExpenses = previousExpenses.filter((expense) => expense.status !== 'cancelled');
  const expenseCurrent = sum(activeExpenses.map((expense) => Number(expense.amount)));
  const expensePrevious = sum(previousActiveExpenses.map((expense) => Number(expense.amount)));
  const manualExpenseCurrent = sum(activeExpenses.filter((expense) => expense.sourceType === ExpenseSourceType.manual).map((expense) => Number(expense.amount)));
  const manualExpensePrevious = sum(previousActiveExpenses.filter((expense) => expense.sourceType === ExpenseSourceType.manual).map((expense) => Number(expense.amount)));
  const paidExpenseCurrent = sum(activeExpenses.filter((expense) => expense.status === 'paid').map((expense) => Number(expense.amount)));
  const paidExpensePrevious = sum(previousActiveExpenses.filter((expense) => expense.status === 'paid').map((expense) => Number(expense.amount)));
  const stockPurchaseExpenseCurrent = sum(activeExpenses.filter((expense) => expense.sourceType === ExpenseSourceType.stock_purchase).map((expense) => Number(expense.amount)));
  const payrollPaymentExpenseCurrent = sum(activeExpenses.filter((expense) => expense.sourceType === ExpenseSourceType.payroll_payment).map((expense) => Number(expense.amount)));
  const salaryAdvanceExpenseCurrent = sum(activeExpenses.filter((expense) => expense.sourceType === ExpenseSourceType.salary_advance).map((expense) => Number(expense.amount)));
  const cashRevenueCurrent = sum(salePayments.map((payment) => Number(payment.amount)));
  const cashRevenuePrevious = sum(previousSalePayments.map((payment) => Number(payment.amount)));
  const cashBenefitCurrent = cashRevenueCurrent - paidExpenseCurrent;
  const cashBenefitPrevious = cashRevenuePrevious - paidExpensePrevious;
  const payrollAccruedCurrent = payrollPeriods.reduce(
    (acc, period) => acc + period.entries.reduce((entrySum, entry) => entrySum + Number(entry.netSalary), 0),
    0
  );
  const payrollAccruedPrevious = previousPayrollPeriods.reduce(
    (acc, period) => acc + period.entries.reduce((entrySum, entry) => entrySum + Number(entry.netSalary), 0),
    0
  );
  const payrollPaidCurrent = sum(payrollPayments.map((payment) => Number(payment.amount)));
  const payrollPaidPrevious = sum(previousPayrollPayments.map((payment) => Number(payment.amount)));
  const activeOrders = sales.filter((sale) => ['pending', 'preparing', 'ready'].includes(sale.status)).length;
  const averageTicketCurrent = nonCancelledSales.length > 0 ? totalSalesCurrent / nonCancelledSales.length : 0;

  const currentStockByIngredient = new Map<number, number>();
  for (const movement of stockMovements) {
    const signedQuantity = Number(movement.quantity) * (movement.type === 'IN' ? 1 : -1);
    currentStockByIngredient.set(movement.ingredientId, (currentStockByIngredient.get(movement.ingredientId) ?? 0) + signedQuantity);
  }

  const stockAlerts = ingredients
    .map((ingredient) => ({
      ingredientId: ingredient.id,
      name: ingredient.name,
      currentStock: currentStockByIngredient.get(ingredient.id) ?? 0,
      purchasePrice: Number(ingredient.purchasePrice),
      threshold: ingredient.minimumStock !== null ? Number(ingredient.minimumStock) : lowStockThreshold
    }))
    .filter((ingredient) => ingredient.currentStock <= ingredient.threshold)
    .sort((left, right) => left.currentStock - right.currentStock);

  const salesPerDayMap = new Map<string, { ordersCount: number; totalSales: number }>();
  const salesByTypeMap = new Map<OrderType, { ordersCount: number; totalSales: number }>();
  const salesByHourMap = new Map<string, { ordersCount: number; totalSales: number }>();
  const statusBreakdownMap = new Map<OrderStatus, number>();
  const topSellingMap = new Map<number, { productId: number; name: string; totalQuantity: number; revenue: number }>();
  const deliveryStatusMap = new Map<DeliveryStatus, number>();
  const revenueByTableMap = new Map<string, { ordersCount: number; totalSales: number }>();

  let estimatedCostsTotal = 0;
  let averagePreparationMinutesAccumulator = 0;
  let averagePreparationCount = 0;
  let averagePaymentMinutesAccumulator = 0;
  let averagePaymentCount = 0;
  let averageDeliveryMinutesAccumulator = 0;
  let averageDeliveryCount = 0;
  let delayedOrders = 0;
  let delayedDeliveries = 0;
  let activeDineInOrders = 0;

  for (const sale of sales) {
    const saleDate = toIsoDate(sale.createdAt);
    const hourLabel = `${String(sale.createdAt.getHours()).padStart(2, '0')}:00`;
    const totalPrice = Number(sale.totalPrice);
    const deliveryFee = Number(sale.deliveryFee);

    statusBreakdownMap.set(sale.status as OrderStatus, (statusBreakdownMap.get(sale.status as OrderStatus) ?? 0) + 1);

    if (sale.status !== 'cancelled') {
      const byDay = salesPerDayMap.get(saleDate) ?? { ordersCount: 0, totalSales: 0 };
      byDay.ordersCount += 1;
      byDay.totalSales += totalPrice;
      salesPerDayMap.set(saleDate, byDay);

      const byType = salesByTypeMap.get(sale.type as OrderType) ?? { ordersCount: 0, totalSales: 0 };
      byType.ordersCount += 1;
      byType.totalSales += totalPrice;
      salesByTypeMap.set(sale.type as OrderType, byType);

      const byHour = salesByHourMap.get(hourLabel) ?? { ordersCount: 0, totalSales: 0 };
      byHour.ordersCount += 1;
      byHour.totalSales += totalPrice;
      salesByHourMap.set(hourLabel, byHour);

      if (sale.type === 'delivery') {
        const status = (sale.deliveryStatus ?? 'pending') as DeliveryStatus;
        deliveryStatusMap.set(status, (deliveryStatusMap.get(status) ?? 0) + 1);
      }

      if (sale.type === 'dine_in' && sale.tableNumber) {
        const tableStats = revenueByTableMap.get(sale.tableNumber) ?? { ordersCount: 0, totalSales: 0 };
        tableStats.ordersCount += 1;
        tableStats.totalSales += totalPrice;
        revenueByTableMap.set(sale.tableNumber, tableStats);
      }

      if (sale.type === 'dine_in' && ['pending', 'preparing', 'ready'].includes(sale.status)) {
        activeDineInOrders += 1;
      }

      if (['preparing', 'ready', 'paid'].includes(sale.status)) {
        averagePreparationMinutesAccumulator += (sale.updatedAt.getTime() - sale.createdAt.getTime()) / 60000;
        averagePreparationCount += 1;
      }

      if (sale.status === 'paid') {
        averagePaymentMinutesAccumulator += (sale.updatedAt.getTime() - sale.createdAt.getTime()) / 60000;
        averagePaymentCount += 1;
      }

      if (sale.type === 'delivery' && sale.deliveryStatus === 'delivered') {
        averageDeliveryMinutesAccumulator += (sale.updatedAt.getTime() - sale.createdAt.getTime()) / 60000;
        averageDeliveryCount += 1;
      }

      if (['pending', 'preparing'].includes(sale.status) && Date.now() - sale.createdAt.getTime() >= 20 * 60000) {
        delayedOrders += 1;
      }

      if (sale.type === 'delivery' && ['pending', 'preparing', 'ready'].includes(sale.status) && Date.now() - sale.createdAt.getTime() >= 45 * 60000) {
        delayedDeliveries += 1;
      }

      for (const item of sale.saleItems) {
        const existing = topSellingMap.get(item.productId) ?? {
          productId: item.productId,
          name: item.product.name,
          totalQuantity: 0,
          revenue: 0
        };
        existing.totalQuantity += item.quantity;
        existing.revenue += item.quantity * Number(item.unitPrice);
        topSellingMap.set(item.productId, existing);

        estimatedCostsTotal += item.quantity * Number(item.product.estimatedCost);
      }
    }

    void deliveryFee;
  }

  const rangeLossMovements = stockMovements.filter(
    (movement) => movement.reason === 'loss' && movement.date >= range.start && movement.date <= range.end
  );
  const rangeSaleMovements = stockMovements.filter(
    (movement) => movement.reason === 'sale' && movement.date >= range.start && movement.date <= range.end
  );

  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const lossMap = new Map<number, { ingredientId: number; name: string; quantity: number; value: number }>();
  const consumptionMap = new Map<number, { ingredientId: number; name: string; quantity: number }>();

  for (const movement of rangeLossMovements) {
    const ingredient = ingredientById.get(movement.ingredientId);
    if (!ingredient) continue;
    const existing = lossMap.get(movement.ingredientId) ?? {
      ingredientId: movement.ingredientId,
      name: ingredient.name,
      quantity: 0,
      value: 0
    };
    existing.quantity += Number(movement.quantity);
    existing.value += Number(movement.quantity) * Number(ingredient.purchasePrice);
    lossMap.set(movement.ingredientId, existing);
  }

  for (const movement of rangeSaleMovements) {
    const ingredient = ingredientById.get(movement.ingredientId);
    if (!ingredient) continue;
    const existing = consumptionMap.get(movement.ingredientId) ?? {
      ingredientId: movement.ingredientId,
      name: ingredient.name,
      quantity: 0
    };
    existing.quantity += Number(movement.quantity);
    consumptionMap.set(movement.ingredientId, existing);
  }

  const stockValue = ingredients.reduce((acc, ingredient) => {
    return acc + (currentStockByIngredient.get(ingredient.id) ?? 0) * Number(ingredient.purchasePrice);
  }, 0);
  const totalLossValue = [...lossMap.values()].reduce((acc, item) => acc + item.value, 0);

  const expensesByCategoryMap = new Map<string, number>();
  const payrollByEmployeeMap = new Map<number, { employeeId: number; employeeName: string; payrollTotal: number; paidTotal: number }>();
  for (const expense of activeExpenses) {
    expensesByCategoryMap.set(expense.category, (expensesByCategoryMap.get(expense.category) ?? 0) + Number(expense.amount));
  }
  for (const period of payrollPeriods) {
    for (const entry of period.entries) {
      const existing = payrollByEmployeeMap.get(entry.employeeId) ?? {
        employeeId: entry.employeeId,
        employeeName: entry.employee.user.fullName,
        payrollTotal: 0,
        paidTotal: 0
      };
      existing.payrollTotal += Number(entry.netSalary);
      payrollByEmployeeMap.set(entry.employeeId, existing);
    }
  }
  for (const payment of payrollPayments) {
    const employeeId = payment.entry.employeeId;
    const existing = payrollByEmployeeMap.get(employeeId) ?? {
      employeeId,
      employeeName: payment.entry.employee.user.fullName,
      payrollTotal: 0,
      paidTotal: 0
    };
    existing.paidTotal += Number(payment.amount);
    payrollByEmployeeMap.set(employeeId, existing);
  }

  const cashBenefitPerDayMap = new Map<
    string,
    {
      sales: number;
      cashIn: number;
      cashOut: number;
      manualExpenses: number;
      stockPurchases: number;
      payrollPaid: number;
      salaryAdvances: number;
    }
  >();
  const dailyCashRow = (date: string) => {
    const existing =
      cashBenefitPerDayMap.get(date) ??
      {
        sales: 0,
        cashIn: 0,
        cashOut: 0,
        manualExpenses: 0,
        stockPurchases: 0,
        payrollPaid: 0,
        salaryAdvances: 0
      };
    cashBenefitPerDayMap.set(date, existing);
    return existing;
  };

  for (const sale of nonCancelledSales) {
    dailyCashRow(toIsoDate(sale.createdAt)).sales += Number(sale.totalPrice);
  }
  for (const payment of salePayments) {
    dailyCashRow(toIsoDate(payment.createdAt)).cashIn += Number(payment.amount);
  }
  for (const expense of activeExpenses) {
    const row = dailyCashRow(toIsoDate(expense.date));
    const amount = Number(expense.amount);
    if (expense.status === 'paid') {
      row.cashOut += amount;
    }
    if (expense.sourceType === ExpenseSourceType.manual) {
      row.manualExpenses += amount;
    }
    if (expense.sourceType === ExpenseSourceType.stock_purchase) {
      row.stockPurchases += amount;
    }
    if (expense.sourceType === ExpenseSourceType.payroll_payment) {
      row.payrollPaid += amount;
    }
    if (expense.sourceType === ExpenseSourceType.salary_advance) {
      row.salaryAdvances += amount;
    }
  }

  const previousEstimatedCostsTotal = previousNonCancelledSales.reduce((acc, sale) => {
    return (
      acc +
      sale.saleItems.reduce((sum, item) => sum + item.quantity * Number(item.product.estimatedCost), 0)
    );
  }, 0);
  const previousLossMovements = stockMovements.filter(
    (movement) => movement.reason === 'loss' && movement.date >= previous.start && movement.date <= previous.end
  );
  const previousLossValue = previousLossMovements.reduce((acc, movement) => {
    const ingredient = ingredientById.get(movement.ingredientId);
    return acc + Number(movement.quantity) * Number(ingredient?.purchasePrice ?? 0);
  }, 0);

  const currentNetProfit = totalSalesCurrent - manualExpenseCurrent - payrollAccruedCurrent - estimatedCostsTotal - totalLossValue;
  const previousNetProfit = totalSalesPrevious - manualExpensePrevious - payrollAccruedPrevious - previousEstimatedCostsTotal - previousLossValue;

  return {
    filters: {
      period: range.period,
      dateFrom: toIsoDate(range.start),
      dateTo: toIsoDate(range.end)
    },
    cards: {
      totalSalesToday: totalSalesCurrent,
      profitToday: currentNetProfit,
      cashBenefitToday: cashBenefitCurrent,
      activeOrders,
      lowStockAlerts: stockAlerts.length,
      averageTicketToday: averageTicketCurrent,
      lossesToday: totalLossValue,
      salesChangePct: percentChange(totalSalesCurrent, totalSalesPrevious),
      profitChangePct: percentChange(currentNetProfit, previousNetProfit),
      cashBenefitChangePct: percentChange(cashBenefitCurrent, cashBenefitPrevious)
    },
    charts: {
      salesPerDay: [...salesPerDayMap.entries()].map(([date, value]) => ({ date, ...value })),
      cashBenefitPerDay: [...cashBenefitPerDayMap.entries()]
        .map(([date, value]) => ({
          date,
          ...value,
          cashBenefit: value.cashIn - value.cashOut
        }))
        .sort((left, right) => left.date.localeCompare(right.date)),
      topSellingProducts: [...topSellingMap.values()]
        .sort((left, right) => right.totalQuantity - left.totalQuantity || right.revenue - left.revenue)
        .slice(0, 8),
      salesByType: [...salesByTypeMap.entries()].map(([type, value]) => ({ type, ...value })),
      salesByHour: [...salesByHourMap.entries()].map(([hour, value]) => ({ hour, ...value }))
    },
    stockAlerts: stockAlerts.map(({ threshold: _threshold, ...item }) => item),
    operations: {
      statusBreakdown: [...statusBreakdownMap.entries()].map(([status, count]) => ({ status, count })),
      averagePreparationMinutes: averagePreparationCount > 0 ? averagePreparationMinutesAccumulator / averagePreparationCount : 0,
      averagePaymentMinutes: averagePaymentCount > 0 ? averagePaymentMinutesAccumulator / averagePaymentCount : 0,
      delayedOrders,
      averageDeliveryMinutes: averageDeliveryCount > 0 ? averageDeliveryMinutesAccumulator / averageDeliveryCount : 0,
      delayedDeliveries
    },
    stockInsights: {
      stockValue,
      totalLossValue,
      lossesByIngredient: [...lossMap.values()].sort((left, right) => right.value - left.value).slice(0, 8),
      topConsumedIngredients: [...consumptionMap.values()].sort((left, right) => right.quantity - left.quantity).slice(0, 8)
    },
    financials: {
      expensesByCategory: [...expensesByCategoryMap.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((left, right) => right.amount - left.amount)
        .slice(0, 8),
      expenseTotal: expenseCurrent,
      manualExpenseTotal: manualExpenseCurrent,
      stockPurchaseTotal: stockPurchaseExpenseCurrent,
      payrollAccruedTotal: payrollAccruedCurrent,
      payrollPaidTotal: payrollPaidCurrent,
      payrollPaymentExpenseTotal: payrollPaymentExpenseCurrent,
      salaryAdvanceTotal: salaryAdvanceExpenseCurrent,
      payrollOutstandingTotal: Math.max(payrollAccruedCurrent - payrollPaidCurrent, 0),
      cashRevenueTotal: cashRevenueCurrent,
      cashOutTotal: paidExpenseCurrent,
      cashBenefitTotal: cashBenefitCurrent,
      payrollByEmployee: [...payrollByEmployeeMap.values()]
        .sort((left, right) => right.payrollTotal - left.payrollTotal)
        .slice(0, 8),
      estimatedCostsTotal
    },
    delivery: {
      totalOrders: nonCancelledSales.filter((sale) => sale.type === 'delivery').length,
      revenue: sum(nonCancelledSales.filter((sale) => sale.type === 'delivery').map((sale) => Number(sale.totalPrice))),
      averageFee:
        nonCancelledSales.filter((sale) => sale.type === 'delivery').length > 0
          ? sum(nonCancelledSales.filter((sale) => sale.type === 'delivery').map((sale) => Number(sale.deliveryFee))) /
            nonCancelledSales.filter((sale) => sale.type === 'delivery').length
          : 0,
      byStatus: [...deliveryStatusMap.entries()].map(([status, count]) => ({ status, count }))
    },
    tables: {
      activeDineInOrders,
      revenueByTable: [...revenueByTableMap.entries()]
        .map(([tableNumber, value]) => ({ tableNumber, ...value }))
        .sort((left, right) => right.totalSales - left.totalSales)
        .slice(0, 8)
    }
  };
}

export async function getProfitReport(filters?: Partial<ReportFilters>) {
  const dashboard = await getDashboardData(filters);
  const range = resolveRange(filters);
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: range.start, lte: range.end },
      status: { not: 'cancelled' }
    },
    include: { saleItems: { include: { product: true } } }
  });

  const byProduct = new Map<number, { productId: number; name: string; revenue: number; estimatedProfit: number; marginRate: number }>();
  for (const sale of sales) {
    for (const item of sale.saleItems) {
      const existing = byProduct.get(item.productId) ?? {
        productId: item.productId,
        name: item.product.name,
        revenue: 0,
        estimatedProfit: 0,
        marginRate: 0
      };
      const revenue = item.quantity * Number(item.unitPrice);
      const profit = item.quantity * (Number(item.unitPrice) - Number(item.product.estimatedCost));
      existing.revenue += revenue;
      existing.estimatedProfit += profit;
      existing.marginRate = existing.revenue > 0 ? (existing.estimatedProfit / existing.revenue) * 100 : 0;
      byProduct.set(item.productId, existing);
    }
  }

  const profitability = [...byProduct.values()].sort((left, right) => right.estimatedProfit - left.estimatedProfit);

  return {
    totals: {
      sales: dashboard.charts.salesPerDay.reduce((sum, row) => sum + row.totalSales, 0),
      netProfit: dashboard.cards.profitToday,
      cashBenefit: dashboard.financials.cashBenefitTotal,
      cashRevenue: dashboard.financials.cashRevenueTotal,
      cashOut: dashboard.financials.cashOutTotal,
      activeOrders: dashboard.cards.activeOrders,
      estimatedCosts: dashboard.financials.estimatedCostsTotal,
      expenses: dashboard.financials.manualExpenseTotal + dashboard.financials.payrollAccruedTotal,
      payroll: dashboard.financials.payrollAccruedTotal,
      losses: dashboard.stockInsights.totalLossValue,
      averageTicket: dashboard.cards.averageTicketToday,
      previousSales:
        dashboard.charts.salesPerDay.reduce((sum, row) => sum + row.totalSales, 0) /
          (1 + dashboard.cards.salesChangePct / 100 || 1),
      previousNetProfit:
        dashboard.cards.profitToday / (1 + dashboard.cards.profitChangePct / 100 || 1)
    },
    margins: {
      bestProducts: profitability.slice(0, 6),
      weakestProducts: [...profitability].sort((left, right) => left.marginRate - right.marginRate).slice(0, 6)
    },
    stockAlerts: dashboard.stockAlerts
  };
}

export async function listStock() {
  const [ingredients, stockMovements] = await Promise.all([prisma.ingredient.findMany(), prisma.stockMovement.findMany()]);
  const stockByIngredient = new Map<number, number>();
  for (const movement of stockMovements) {
    const signedQuantity = Number(movement.quantity) * (movement.type === 'IN' ? 1 : -1);
    stockByIngredient.set(movement.ingredientId, (stockByIngredient.get(movement.ingredientId) ?? 0) + signedQuantity);
  }

  return ingredients
    .map((ingredient) => ({
      ingredientId: ingredient.id,
      name: ingredient.name,
      currentStock: stockByIngredient.get(ingredient.id) ?? 0,
      purchasePrice: Number(ingredient.purchasePrice)
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
