import { Router } from 'express';
import { requirePermission } from '../lib/authMiddleware';
import { asyncHandler } from '../lib/asyncHandler';
import { createOrder, createPayment, listOrders, updateDeliveryStatus, updateOrderStatus } from '../services/orderService';

export const ordersRouter = Router();

ordersRouter.get(
  '/',
  requirePermission('sales.read', 'pos.cashier', 'pos.delivery'),
  asyncHandler(async (_req, res) => {
    const data = await listOrders();
    res.json({ success: true, data });
  })
);

ordersRouter.post(
  '/',
  requirePermission('pos.use'),
  asyncHandler(async (req, res) => {
    const data = await createOrder(req.body);
    res.status(201).json({ success: true, data });
  })
);

ordersRouter.patch(
  '/:id/status',
  requirePermission('pos.kitchen'),
  asyncHandler(async (req, res) => {
    const data = await updateOrderStatus(Number(req.params.id), String(req.body.status));
    res.json({ success: true, data });
  })
);

ordersRouter.patch(
  '/:id/cancel',
  requirePermission('sales.read', 'pos.cashier', 'pos.use', 'pos.kitchen'),
  asyncHandler(async (req, res) => {
    const data = await updateOrderStatus(Number(req.params.id), 'cancelled');
    res.json({ success: true, data });
  })
);

ordersRouter.patch(
  '/:id/delivery-status',
  requirePermission('pos.delivery'),
  asyncHandler(async (req, res) => {
    const data = await updateDeliveryStatus(Number(req.params.id), String(req.body.deliveryStatus));
    res.json({ success: true, data });
  })
);

ordersRouter.post(
  '/:id/pay',
  requirePermission('pos.cashier'),
  asyncHandler(async (req, res) => {
    const data = await createPayment(Number(req.params.id), String(req.body.method));
    res.json({ success: true, data });
  })
);
