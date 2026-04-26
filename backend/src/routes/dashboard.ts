import { Router } from 'express';
import { requirePermission } from '../lib/authMiddleware';
import { asyncHandler } from '../lib/asyncHandler';
import { getDashboardData, getProfitReport, listStock } from '../services/dashboardService';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/dashboard',
  requirePermission('reports.read'),
  asyncHandler(async (_req, res) => {
    const data = await getDashboardData();
    res.json({ success: true, data });
  })
);

dashboardRouter.get(
  '/reports/dashboard',
  requirePermission('reports.read'),
  asyncHandler(async (_req, res) => {
    const data = await getDashboardData();
    res.json({ success: true, data });
  })
);

dashboardRouter.get(
  '/reports/profit',
  requirePermission('reports.read'),
  asyncHandler(async (_req, res) => {
    const data = await getProfitReport();
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
