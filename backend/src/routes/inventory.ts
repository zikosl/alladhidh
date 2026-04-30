import { Router } from 'express';
import { requirePermission } from '../lib/authMiddleware';
import { asyncHandler } from '../lib/asyncHandler';
import {
  createInventoryCategory,
  createInventoryItem,
  createStockEntry,
  createStockLoss,
  deleteInventoryCategory,
  deleteInventoryItem,
  listInventoryCategories,
  listInventoryItems,
  listStockMovements,
  updateInventoryItem
} from '../services/inventoryService';

export const inventoryRouter = Router();

inventoryRouter.get(
  '/',
  requirePermission('inventory.read', 'inventory.write'),
  asyncHandler(async (_req, res) => {
    const data = await listInventoryItems();
    res.json({ success: true, data });
  })
);

inventoryRouter.get(
  '/categories',
  requirePermission('inventory.read', 'inventory.write'),
  asyncHandler(async (_req, res) => {
    const data = await listInventoryCategories();
    res.json({ success: true, data });
  })
);

inventoryRouter.get(
  '/movements',
  requirePermission('inventory.read', 'inventory.write'),
  asyncHandler(async (req, res) => {
    const data = await listStockMovements(Number(req.query.limit ?? 120));
    res.json({ success: true, data });
  })
);

inventoryRouter.post(
  '/categories',
  requirePermission('inventory.write'),
  asyncHandler(async (req, res) => {
    const data = await createInventoryCategory(req.body);
    res.status(201).json({ success: true, data });
  })
);

inventoryRouter.delete(
  '/categories/:id',
  requirePermission('inventory.write'),
  asyncHandler(async (req, res) => {
    await deleteInventoryCategory(Number(req.params.id));
    res.json({ success: true });
  })
);

inventoryRouter.post(
  '/entries',
  requirePermission('inventory.write'),
  asyncHandler(async (req, res) => {
    const data = await createStockEntry(req.body);
    res.status(201).json({ success: true, data });
  })
);

inventoryRouter.post(
  '/losses',
  requirePermission('inventory.write'),
  asyncHandler(async (req, res) => {
    const data = await createStockLoss(req.body);
    res.status(201).json({ success: true, data });
  })
);

inventoryRouter.post(
  '/',
  requirePermission('inventory.write'),
  asyncHandler(async (req, res) => {
    const data = await createInventoryItem(req.body);
    res.status(201).json({ success: true, data });
  })
);

inventoryRouter.put(
  '/:id',
  requirePermission('inventory.write'),
  asyncHandler(async (req, res) => {
    const data = await updateInventoryItem(Number(req.params.id), req.body);
    res.json({ success: true, data });
  })
);

inventoryRouter.delete(
  '/:id',
  requirePermission('inventory.write'),
  asyncHandler(async (req, res) => {
    await deleteInventoryItem(Number(req.params.id));
    res.json({ success: true });
  })
);
