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

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

export async function getDashboardData() {
  const lowStockThreshold = Number(process.env.LOW_STOCK_THRESHOLD ?? 1000);
  const [salesToday, expensesToday, activeOrders, dailySales, topProducts, stockAlerts] = await Promise.all([
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
    `)
  ]);

  const totalSalesToday = toNumber(salesToday[0]?.value);
  const totalExpensesToday = toNumber(expensesToday[0]?.value);

  return {
    cards: {
      totalSalesToday,
      profitToday: totalSalesToday - totalExpensesToday,
      activeOrders: toNumber(activeOrders[0]?.value),
      lowStockAlerts: stockAlerts.length
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
      }))
    },
    stockAlerts: stockAlerts.map((row) => ({
      ingredientId: row.ingredient_id,
      name: row.name,
      currentStock: toNumber(row.current_stock),
      purchasePrice: toNumber(row.purchase_price)
    }))
  };
}

export async function getProfitReport() {
  const dashboard = await getDashboardData();
  return {
    totals: {
      sales: dashboard.cards.totalSalesToday,
      netProfit: dashboard.cards.profitToday,
      activeOrders: dashboard.cards.activeOrders
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
