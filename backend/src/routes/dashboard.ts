import { Router } from 'express';
import { requirePermission } from '../lib/authMiddleware';
import { asyncHandler } from '../lib/asyncHandler';
import { getDashboardData, getProfitReport, listStock } from '../services/dashboardService';
import { ReportFilters } from '../types/pos';

export const dashboardRouter = Router();

function getFilters(query: Record<string, unknown>): Partial<ReportFilters> {
  return {
    period: typeof query.period === 'string' ? (query.period as ReportFilters['period']) : '7d',
    dateFrom: typeof query.dateFrom === 'string' ? query.dateFrom : undefined,
    dateTo: typeof query.dateTo === 'string' ? query.dateTo : undefined
  };
}

dashboardRouter.get(
  '/dashboard',
  requirePermission('reports.read'),
  asyncHandler(async (req, res) => {
    const data = await getDashboardData(getFilters(req.query));
    res.json({ success: true, data });
  })
);

dashboardRouter.get(
  '/reports/dashboard',
  requirePermission('reports.read'),
  asyncHandler(async (req, res) => {
    const data = await getDashboardData(getFilters(req.query));
    res.json({ success: true, data });
  })
);

dashboardRouter.get(
  '/reports/profit',
  requirePermission('reports.read'),
  asyncHandler(async (req, res) => {
    const data = await getProfitReport(getFilters(req.query));
    res.json({ success: true, data });
  })
);

dashboardRouter.get(
  '/stock',
  requirePermission('inventory.read', 'inventory.write'),
  asyncHandler(async (_req, res) => {
    const data = await listStock();
    res.json({ success: true, data });
  })
);
