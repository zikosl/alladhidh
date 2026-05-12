import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { requirePermission } from '../lib/authMiddleware';
import { completeAlert, createAlert, listAlerts } from '../services/alertService';

export const alertsRouter = Router();

alertsRouter.get(
  '/',
  requirePermission('alerts.read', 'alerts.write'),
  asyncHandler(async (_req, res) => {
    const data = await listAlerts();
    res.json({ success: true, data });
  })
);

alertsRouter.post(
  '/',
  requirePermission('alerts.write'),
  asyncHandler(async (req, res) => {
    const data = await createAlert({
      ...req.body,
      createdById: req.authUser?.id ?? null
    });
    res.status(201).json({ success: true, data });
  })
);

alertsRouter.patch(
  '/:id/complete',
  requirePermission('alerts.write'),
  asyncHandler(async (req, res) => {
    const data = await completeAlert(Number(req.params.id));
    res.json({ success: true, data });
  })
);
