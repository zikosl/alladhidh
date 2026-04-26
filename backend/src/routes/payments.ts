import { Router } from 'express';
import { requirePermission } from '../lib/authMiddleware';
import { asyncHandler } from '../lib/asyncHandler';
import { createPayment } from '../services/orderService';

export const paymentsRouter = Router();

paymentsRouter.post(
  '/',
  requirePermission('pos.cashier'),
  asyncHandler(async (req, res) => {
    const data = await createPayment(Number(req.body.orderId), String(req.body.method));
    res.json({ success: true, data });
  })
);
