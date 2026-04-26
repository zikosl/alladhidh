import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface MetricRow {
  value: Prisma.Decimal | number | string | null;
}

interface DailySalesRow {
  sale_date: string;
  orders_count: number;
  total_sales: Prisma.Decimal | number | string;
}

interface TopProductRow {
  product_id: number;
  name: string;
  total_quantity: Prisma.Decimal | number | string;
  revenue: Prisma.Decimal | number | string;
}

interface StockAlertRow {
  ingredient_id: number;
  name: string;
  current_stock: Prisma.Decimal | number | string;
  purchase_price: Prisma.Decimal | number | string;
}

interface SalesByTypeRow {
  type: 'dine_in' | 'take_away' | 'delivery';
  orders_count: number;
  total_sales: Prisma.Decimal | number | string;
}

interface SalesByHourRow {
  sale_hour: string;
  orders_count: number;
  total_sales: Prisma.Decimal | number | string;
}

interface StatusRow {
  status: 'pending' | 'preparing' | 'ready' | 'paid' | 'cancelled';
  count: number;
}

interface DurationRow {
  value: Prisma.Decimal | number | string | null;
}

interface LossRow {
  ingredient_id: number;
  name: string;
  total_quantity: Prisma.Decimal | number | string;
  total_value: Prisma.Decimal | number | string;
}

interface ConsumptionRow {
  ingredient_id: number;
  name: string;
  total_quantity: Prisma.Decimal | number | string;
}

interface ExpenseCategoryRow {
  category: string;
  amount: Prisma.Decimal | number | string;
}

interface DeliveryStatusRow {
  status: 'pending' | 'on_the_way' | 'delivered';
  count: number;
}

interface TableRevenueRow {
  table_number: string;
  orders_count: number;
  total_sales: Prisma.Decimal | number | string;
}

interface ProductProfitRow {
  product_id: number;
  name: string;
  revenue: Prisma.Decimal | number | string;
  estimated_profit: Prisma.Decimal | number | string;
  margin_rate: Prisma.Decimal | number | string;
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

export async function getDashboardData() {
  const lowStockThreshold = Number(process.env.LOW_STOCK_THRESHOLD ?? 1000);
  const [
    salesToday,
    expensesToday,
    activeOrders,
    ordersToday,
    dailySales,
    topProducts,
    stockAlerts,
    salesByType,
    salesByHour,
    statusBreakdown,
    averagePreparationMinutes,
    averagePaymentMinutes,
    delayedOrders,
    averageDeliveryMinutes,
    delayedDeliveries,
    lossesToday,
    lossesByIngredient,
    topConsumedIngredients,
    stockValue,
    expensesByCategory,
    expenseTotal,
    estimatedCostsTotal,
    deliveryOrders,
    deliveryRevenue,
    averageDeliveryFee,
    deliveryByStatus,
    activeDineInOrders,
    revenueByTable
  ] = await Promise.all([
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COALESCE(SUM(total_price), 0) AS value
      FROM sales
      WHERE status != 'cancelled'
        AND DATE(created_at) = CURRENT_DATE
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COALESCE(SUM(amount), 0) AS value
      FROM expenses
      WHERE DATE(date) = CURRENT_DATE
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COUNT(*) AS value
      FROM sales
      WHERE status IN ('pending', 'preparing', 'ready')
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COUNT(*) AS value
      FROM sales
      WHERE status != 'cancelled'
        AND DATE(created_at) = CURRENT_DATE
    `),
    prisma.$queryRaw<DailySalesRow[]>(Prisma.sql`
      SELECT
        TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS sale_date,
        COUNT(*)::int AS orders_count,
        COALESCE(SUM(total_price), 0) AS total_sales
      FROM sales
      WHERE status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 7
    `),
    prisma.$queryRaw<TopProductRow[]>(Prisma.sql`
      SELECT
        p.id AS product_id,
        p.name,
        COALESCE(SUM(si.quantity), 0) AS total_quantity,
        COALESCE(SUM(si.quantity * si.unit_price), 0) AS revenue
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE s.status != 'cancelled'
      GROUP BY p.id
      ORDER BY SUM(si.quantity) DESC, SUM(si.quantity * si.unit_price) DESC
      LIMIT 8
    `),
    prisma.$queryRaw<StockAlertRow[]>(Prisma.sql`
      SELECT
        i.id AS ingredient_id,
        i.name,
        COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0) AS current_stock,
        i.purchase_price
      FROM ingredients i
      LEFT JOIN stock_movements sm ON sm.ingredient_id = i.id
      GROUP BY i.id
      HAVING COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0) <= ${lowStockThreshold}
      ORDER BY current_stock ASC
    `),
    prisma.$queryRaw<SalesByTypeRow[]>(Prisma.sql`
      SELECT
        type,
        COUNT(*)::int AS orders_count,
        COALESCE(SUM(total_price), 0) AS total_sales
      FROM sales
      WHERE status != 'cancelled'
      GROUP BY type
      ORDER BY total_sales DESC
    `),
    prisma.$queryRaw<SalesByHourRow[]>(Prisma.sql`
      SELECT
        TO_CHAR(DATE_TRUNC('hour', created_at), 'HH24:00') AS sale_hour,
        COUNT(*)::int AS orders_count,
        COALESCE(SUM(total_price), 0) AS total_sales
      FROM sales
      WHERE status != 'cancelled'
        AND DATE(created_at) = CURRENT_DATE
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY DATE_TRUNC('hour', created_at)
    `),
    prisma.$queryRaw<StatusRow[]>(Prisma.sql`
      SELECT status, COUNT(*)::int AS count
      FROM sales
      GROUP BY status
    `),
    prisma.$queryRaw<DurationRow[]>(Prisma.sql`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM updated_at - created_at) / 60), 0) AS value
      FROM sales
      WHERE status IN ('preparing', 'ready', 'paid')
        AND status != 'cancelled'
    `),
    prisma.$queryRaw<DurationRow[]>(Prisma.sql`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM updated_at - created_at) / 60), 0) AS value
      FROM sales
      WHERE status = 'paid'
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COUNT(*) AS value
      FROM sales
      WHERE status IN ('pending', 'preparing')
        AND created_at <= NOW() - INTERVAL '20 minutes'
    `),
    prisma.$queryRaw<DurationRow[]>(Prisma.sql`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM updated_at - created_at) / 60), 0) AS value
      FROM sales
      WHERE type = 'delivery'
        AND delivery_status = 'delivered'
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COUNT(*) AS value
      FROM sales
      WHERE type = 'delivery'
        AND delivery_status IN ('pending', 'on_the_way')
        AND created_at <= NOW() - INTERVAL '45 minutes'
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COALESCE(SUM(sm.quantity * i.purchase_price), 0) AS value
      FROM stock_movements sm
      JOIN ingredients i ON i.id = sm.ingredient_id
      WHERE sm.reason = 'loss'
        AND DATE(sm.date) = CURRENT_DATE
    `),
    prisma.$queryRaw<LossRow[]>(Prisma.sql`
      SELECT
        i.id AS ingredient_id,
        i.name,
        COALESCE(SUM(sm.quantity), 0) AS total_quantity,
        COALESCE(SUM(sm.quantity * i.purchase_price), 0) AS total_value
      FROM stock_movements sm
      JOIN ingredients i ON i.id = sm.ingredient_id
      WHERE sm.reason = 'loss'
      GROUP BY i.id
      ORDER BY total_value DESC
      LIMIT 8
    `),
    prisma.$queryRaw<ConsumptionRow[]>(Prisma.sql`
      SELECT
        i.id AS ingredient_id,
        i.name,
        COALESCE(SUM(sm.quantity), 0) AS total_quantity
      FROM stock_movements sm
      JOIN ingredients i ON i.id = sm.ingredient_id
      WHERE sm.reason = 'sale'
      GROUP BY i.id
      ORDER BY total_quantity DESC
      LIMIT 8
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COALESCE(SUM(stock.current_stock * i.purchase_price), 0) AS value
      FROM ingredients i
      JOIN (
        SELECT ingredient_id, COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE -quantity END), 0) AS current_stock
        FROM stock_movements
        GROUP BY ingredient_id
      ) AS stock ON stock.ingredient_id = i.id
    `),
    prisma.$queryRaw<ExpenseCategoryRow[]>(Prisma.sql`
      SELECT category, COALESCE(SUM(amount), 0) AS amount
      FROM expenses
      GROUP BY category
      ORDER BY amount DESC
      LIMIT 8
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COALESCE(SUM(amount), 0) AS value
      FROM expenses
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COALESCE(SUM(si.quantity * p.estimated_cost), 0) AS value
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE s.status != 'cancelled'
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COUNT(*) AS value
      FROM sales
      WHERE type = 'delivery'
        AND status != 'cancelled'
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COALESCE(SUM(total_price), 0) AS value
      FROM sales
      WHERE type = 'delivery'
        AND status != 'cancelled'
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COALESCE(AVG(delivery_fee), 0) AS value
      FROM sales
      WHERE type = 'delivery'
        AND status != 'cancelled'
    `),
    prisma.$queryRaw<DeliveryStatusRow[]>(Prisma.sql`
      SELECT COALESCE(delivery_status, 'pending') AS status, COUNT(*)::int AS count
      FROM sales
      WHERE type = 'delivery'
      GROUP BY COALESCE(delivery_status, 'pending')
    `),
    prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT COUNT(*) AS value
      FROM sales
      WHERE type = 'dine_in'
        AND status IN ('pending', 'preparing', 'ready')
    `),
    prisma.$queryRaw<TableRevenueRow[]>(Prisma.sql`
      SELECT
        table_number,
        COUNT(*)::int AS orders_count,
        COALESCE(SUM(total_price), 0) AS total_sales
      FROM sales
      WHERE type = 'dine_in'
        AND status != 'cancelled'
        AND table_number IS NOT NULL
      GROUP BY table_number
      ORDER BY total_sales DESC
      LIMIT 8
    `)
  ]);

  const totalSalesToday = toNumber(salesToday[0]?.value);
  const totalExpensesToday = toNumber(expensesToday[0]?.value);
  const ordersCountToday = toNumber(ordersToday[0]?.value);

  return {
    cards: {
      totalSalesToday,
      profitToday: totalSalesToday - totalExpensesToday,
      activeOrders: toNumber(activeOrders[0]?.value),
      lowStockAlerts: stockAlerts.length,
      averageTicketToday: ordersCountToday > 0 ? totalSalesToday / ordersCountToday : 0,
      lossesToday: toNumber(lossesToday[0]?.value)
    },
    charts: {
      salesPerDay: dailySales.map((row) => ({
        date: row.sale_date,
        ordersCount: row.orders_count,
        totalSales: toNumber(row.total_sales)
      })),
      topSellingProducts: topProducts.map((row) => ({
        productId: row.product_id,
        name: row.name,
        totalQuantity: toNumber(row.total_quantity),
        revenue: toNumber(row.revenue)
      })),
      salesByType: salesByType.map((row) => ({
        type: row.type,
        ordersCount: row.orders_count,
        totalSales: toNumber(row.total_sales)
      })),
      salesByHour: salesByHour.map((row) => ({
        hour: row.sale_hour,
        ordersCount: row.orders_count,
        totalSales: toNumber(row.total_sales)
      }))
    },
    stockAlerts: stockAlerts.map((row) => ({
      ingredientId: row.ingredient_id,
      name: row.name,
      currentStock: toNumber(row.current_stock),
      purchasePrice: toNumber(row.purchase_price)
    })),
    operations: {
      statusBreakdown: statusBreakdown.map((row) => ({
        status: row.status,
        count: row.count
      })),
      averagePreparationMinutes: toNumber(averagePreparationMinutes[0]?.value),
      averagePaymentMinutes: toNumber(averagePaymentMinutes[0]?.value),
      delayedOrders: toNumber(delayedOrders[0]?.value),
      averageDeliveryMinutes: toNumber(averageDeliveryMinutes[0]?.value),
      delayedDeliveries: toNumber(delayedDeliveries[0]?.value)
    },
    stockInsights: {
      stockValue: toNumber(stockValue[0]?.value),
      totalLossValue: lossesByIngredient.reduce((sum, row) => sum + toNumber(row.total_value), 0),
      lossesByIngredient: lossesByIngredient.map((row) => ({
        ingredientId: row.ingredient_id,
        name: row.name,
        quantity: toNumber(row.total_quantity),
        value: toNumber(row.total_value)
      })),
      topConsumedIngredients: topConsumedIngredients.map((row) => ({
        ingredientId: row.ingredient_id,
        name: row.name,
        quantity: toNumber(row.total_quantity)
      }))
    },
    financials: {
      expensesByCategory: expensesByCategory.map((row) => ({
        category: row.category,
        amount: toNumber(row.amount)
      })),
      expenseTotal: toNumber(expenseTotal[0]?.value),
      estimatedCostsTotal: toNumber(estimatedCostsTotal[0]?.value)
    },
    delivery: {
      totalOrders: toNumber(deliveryOrders[0]?.value),
      revenue: toNumber(deliveryRevenue[0]?.value),
      averageFee: toNumber(averageDeliveryFee[0]?.value),
      byStatus: deliveryByStatus.map((row) => ({
        status: row.status,
        count: row.count
      }))
    },
    tables: {
      activeDineInOrders: toNumber(activeDineInOrders[0]?.value),
      revenueByTable: revenueByTable.map((row) => ({
        tableNumber: row.table_number,
        ordersCount: row.orders_count,
        totalSales: toNumber(row.total_sales)
      }))
    }
  };
}

export async function getProfitReport() {
  const [dashboard, productProfitability] = await Promise.all([
    getDashboardData(),
    prisma.$queryRaw<ProductProfitRow[]>(Prisma.sql`
      SELECT
        p.id AS product_id,
        p.name,
        COALESCE(SUM(si.quantity * si.unit_price), 0) AS revenue,
        COALESCE(SUM(si.quantity * (si.unit_price - p.estimated_cost)), 0) AS estimated_profit,
        CASE
          WHEN COALESCE(SUM(si.quantity * si.unit_price), 0) = 0 THEN 0
          ELSE ROUND(
            (
              COALESCE(SUM(si.quantity * (si.unit_price - p.estimated_cost)), 0)
              / COALESCE(SUM(si.quantity * si.unit_price), 1)
            ) * 100
          , 2)
        END AS margin_rate
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE s.status != 'cancelled'
      GROUP BY p.id
      HAVING COALESCE(SUM(si.quantity), 0) > 0
      ORDER BY estimated_profit DESC
    `)
  ]);

  const profitability = productProfitability.map((row) => ({
    productId: row.product_id,
    name: row.name,
    revenue: toNumber(row.revenue),
    estimatedProfit: toNumber(row.estimated_profit),
    marginRate: toNumber(row.margin_rate)
  }));
  return {
    totals: {
      sales: dashboard.charts.salesPerDay.reduce((sum, row) => sum + row.totalSales, 0),
      netProfit:
        dashboard.charts.salesPerDay.reduce((sum, row) => sum + row.totalSales, 0) -
        dashboard.financials.expenseTotal -
        dashboard.financials.estimatedCostsTotal -
        dashboard.stockInsights.totalLossValue,
      activeOrders: dashboard.cards.activeOrders,
      estimatedCosts: dashboard.financials.estimatedCostsTotal,
      expenses: dashboard.financials.expenseTotal,
      losses: dashboard.stockInsights.totalLossValue,
      averageTicket:
        dashboard.charts.salesPerDay.reduce((sum, row) => sum + row.ordersCount, 0) > 0
          ? dashboard.charts.salesPerDay.reduce((sum, row) => sum + row.totalSales, 0) /
            dashboard.charts.salesPerDay.reduce((sum, row) => sum + row.ordersCount, 0)
          : 0
    },
    margins: {
      bestProducts: profitability.slice(0, 6),
      weakestProducts: [...profitability].sort((left, right) => left.marginRate - right.marginRate).slice(0, 6)
    },
    stockAlerts: dashboard.stockAlerts
  };
}

export async function listStock() {
  const rows = await prisma.$queryRaw<StockAlertRow[]>(Prisma.sql`
    SELECT
      i.id AS ingredient_id,
      i.name,
      COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0) AS current_stock,
      i.purchase_price
    FROM ingredients i
    LEFT JOIN stock_movements sm ON sm.ingredient_id = i.id
    GROUP BY i.id
    ORDER BY i.name
  `);

  return rows.map((row) => ({
    ingredientId: row.ingredient_id,
    name: row.name,
    currentStock: toNumber(row.current_stock),
    purchasePrice: toNumber(row.purchase_price)
  }));
}
