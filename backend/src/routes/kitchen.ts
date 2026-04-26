import { Router } from 'express';
import { requirePermission } from '../lib/authMiddleware';
import { asyncHandler } from '../lib/asyncHandler';
import { getKitchenOrders } from '../services/orderService';

export const kitchenRouter = Router();

kitchenRouter.get(
  '/',
  requirePermission('pos.kitchen'),
  asyncHandler(async (_req, res) => {
    const data = await getKitchenOrders();
    res.json({ success: true, data });
  })
);
