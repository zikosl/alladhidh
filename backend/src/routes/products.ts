import { Router } from 'express';
import { requirePermission } from '../lib/authMiddleware';
import { asyncHandler } from '../lib/asyncHandler';
import { listProducts } from '../services/catalogService';

export const productsRouter = Router();

productsRouter.get(
  '/',
  requirePermission('pos.use', 'pos.cashier', 'pos.kitchen', 'pos.delivery', 'sales.read'),
  asyncHandler(async (_req, res) => {
    const data = await listProducts();
    res.json({ success: true, data });
  })
);
