import { Router } from 'express';
import { requirePermission } from '../lib/authMiddleware';
import { asyncHandler } from '../lib/asyncHandler';
import {
  createMenuCategory,
  createMenuItem,
  deleteMenuCategory,
  deleteMenuItem,
  listMenuCategories,
  listMenuItems,
  updateMenuItem
} from '../services/menuService';

export const menuRouter = Router();

menuRouter.get(
  '/',
  requirePermission('recipes.read', 'recipes.write'),
  asyncHandler(async (_req, res) => {
    const data = await listMenuItems();
    res.json({ success: true, data });
  })
);

menuRouter.get(
  '/categories',
  requirePermission('recipes.read', 'recipes.write'),
  asyncHandler(async (_req, res) => {
    const data = await listMenuCategories();
    res.json({ success: true, data });
  })
);

menuRouter.post(
  '/categories',
  requirePermission('recipes.write'),
  asyncHandler(async (req, res) => {
    const data = await createMenuCategory(req.body);
    res.status(201).json({ success: true, data });
  })
);

menuRouter.delete(
  '/categories/:id',
  requirePermission('recipes.write'),
  asyncHandler(async (req, res) => {
    await deleteMenuCategory(Number(req.params.id));
    res.json({ success: true });
  })
);

menuRouter.post(
  '/',
  requirePermission('recipes.write'),
  asyncHandler(async (req, res) => {
    const data = await createMenuItem(req.body);
    res.status(201).json({ success: true, data });
  })
);

menuRouter.put(
  '/:id',
  requirePermission('recipes.write'),
  asyncHandler(async (req, res) => {
    const data = await updateMenuItem(Number(req.params.id), req.body);
    res.json({ success: true, data });
  })
);

menuRouter.delete(
  '/:id',
  requirePermission('recipes.write'),
  asyncHandler(async (req, res) => {
    await deleteMenuItem(Number(req.params.id));
    res.json({ success: true });
  })
);
