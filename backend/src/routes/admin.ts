import { Router } from 'express';
import { requirePermission } from '../lib/authMiddleware';
import { asyncHandler } from '../lib/asyncHandler';
import {
  createRestaurantTable,
  createStaffUser,
  deleteRestaurantTable,
  getRestaurantSettings,
  listPermissions,
  listRestaurantTables,
  listRoles,
  listStaffUsers,
  resetStaffPassword,
  updateRestaurantSettings,
  updateRestaurantTable,
  updateRolePermissions,
  updateStaffUser
} from '../services/adminService';

export const adminRouter = Router();

adminRouter.get(
  '/users',
  requirePermission('staff.manage'),
  asyncHandler(async (_req, res) => {
    const data = await listStaffUsers();
    res.json({ success: true, data });
  })
);

adminRouter.post(
  '/users',
  requirePermission('staff.manage'),
  asyncHandler(async (req, res) => {
    const data = await createStaffUser(req.body);
    res.status(201).json({ success: true, data });
  })
);

adminRouter.put(
  '/users/:id',
  requirePermission('staff.manage'),
  asyncHandler(async (req, res) => {
    const data = await updateStaffUser(Number(req.params.id), req.body);
    res.json({ success: true, data });
  })
);

adminRouter.patch(
  '/users/:id/password',
  requirePermission('staff.manage'),
  asyncHandler(async (req, res) => {
    await resetStaffPassword(Number(req.params.id), String(req.body.password ?? ''));
    res.json({ success: true });
  })
);

adminRouter.get(
  '/roles',
  requirePermission('roles.manage'),
  asyncHandler(async (_req, res) => {
    const data = await listRoles();
    res.json({ success: true, data });
  })
);

adminRouter.get(
  '/permissions',
  requirePermission('roles.manage'),
  asyncHandler(async (_req, res) => {
    const data = await listPermissions();
    res.json({ success: true, data });
  })
);

adminRouter.put(
  '/roles/:id/permissions',
  requirePermission('roles.manage'),
  asyncHandler(async (req, res) => {
    const data = await updateRolePermissions(Number(req.params.id), Array.isArray(req.body.permissions) ? req.body.permissions : []);
    res.json({ success: true, data });
  })
);

adminRouter.get(
  '/tables',
  requirePermission('tables.manage', 'pos.use'),
  asyncHandler(async (_req, res) => {
    const data = await listRestaurantTables();
    res.json({ success: true, data });
  })
);

adminRouter.post(
  '/tables',
  requirePermission('tables.manage'),
  asyncHandler(async (req, res) => {
    const data = await createRestaurantTable(req.body);
    res.status(201).json({ success: true, data });
  })
);

adminRouter.put(
  '/tables/:id',
  requirePermission('tables.manage'),
  asyncHandler(async (req, res) => {
    const data = await updateRestaurantTable(Number(req.params.id), req.body);
    res.json({ success: true, data });
  })
);

adminRouter.delete(
  '/tables/:id',
  requirePermission('tables.manage'),
  asyncHandler(async (req, res) => {
    await deleteRestaurantTable(Number(req.params.id));
    res.json({ success: true });
  })
);

adminRouter.get(
  '/settings',
  requirePermission('settings.read'),
  asyncHandler(async (_req, res) => {
    const data = await getRestaurantSettings();
    res.json({ success: true, data });
  })
);

adminRouter.put(
  '/settings',
  requirePermission('settings.write'),
  asyncHandler(async (req, res) => {
    const data = await updateRestaurantSettings(req.body);
    res.json({ success: true, data });
  })
);
