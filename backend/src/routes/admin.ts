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
import {
  upsertEmployeeProfile,
  createPayrollAdjustment,
  createExpense,
  createExpenseCategory,
  createPayrollPayment,
  createPayrollPeriod,
  createSalaryAdvance,
  deleteCashSession,
  deleteExpense,
  deleteExpenseCategory,
  deletePayrollAdjustment,
  listCashSessions,
  listEmployeeProfiles,
  listExpenseCategories,
  listExpenses,
  listPayrollAdjustments,
  listPayrollPeriods,
  listSalaryAdvances,
  upsertCashSession,
  updateExpense,
  updatePayrollEntry,
  updatePayrollPeriodStatus
} from '../services/financeService';

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

adminRouter.get(
  '/finance/categories',
  requirePermission('finance.read', 'finance.write'),
  asyncHandler(async (_req, res) => {
    const data = await listExpenseCategories();
    res.json({ success: true, data });
  })
);

adminRouter.post(
  '/finance/categories',
  requirePermission('finance.write'),
  asyncHandler(async (req, res) => {
    const data = await createExpenseCategory(req.body);
    res.status(201).json({ success: true, data });
  })
);

adminRouter.delete(
  '/finance/categories/:id',
  requirePermission('finance.write'),
  asyncHandler(async (req, res) => {
    await deleteExpenseCategory(Number(req.params.id));
    res.json({ success: true });
  })
);

adminRouter.get(
  '/finance/expenses',
  requirePermission('finance.read', 'finance.write'),
  asyncHandler(async (_req, res) => {
    const data = await listExpenses();
    res.json({ success: true, data });
  })
);

adminRouter.post(
  '/finance/expenses',
  requirePermission('finance.write'),
  asyncHandler(async (req, res) => {
    const data = await createExpense(req.body);
    res.status(201).json({ success: true, data });
  })
);

adminRouter.put(
  '/finance/expenses/:id',
  requirePermission('finance.write'),
  asyncHandler(async (req, res) => {
    const data = await updateExpense(Number(req.params.id), req.body);
    res.json({ success: true, data });
  })
);

adminRouter.delete(
  '/finance/expenses/:id',
  requirePermission('finance.write'),
  asyncHandler(async (req, res) => {
    await deleteExpense(Number(req.params.id));
    res.json({ success: true });
  })
);

adminRouter.get(
  '/finance/cash-sessions',
  requirePermission('finance.read', 'finance.write'),
  asyncHandler(async (_req, res) => {
    const data = await listCashSessions();
    res.json({ success: true, data });
  })
);

adminRouter.post(
  '/finance/cash-sessions',
  requirePermission('finance.write'),
  asyncHandler(async (req, res) => {
    const data = await upsertCashSession(req.body);
    res.status(201).json({ success: true, data });
  })
);

adminRouter.put(
  '/finance/cash-sessions/:id',
  requirePermission('finance.write'),
  asyncHandler(async (req, res) => {
    const data = await upsertCashSession({ ...req.body, id: Number(req.params.id) });
    res.json({ success: true, data });
  })
);

adminRouter.delete(
  '/finance/cash-sessions/:id',
  requirePermission('finance.write'),
  asyncHandler(async (req, res) => {
    await deleteCashSession(Number(req.params.id));
    res.json({ success: true });
  })
);

adminRouter.get(
  '/payroll/employees',
  requirePermission('payroll.read', 'payroll.write'),
  asyncHandler(async (_req, res) => {
    const data = await listEmployeeProfiles();
    res.json({ success: true, data });
  })
);

adminRouter.put(
  '/payroll/employees',
  requirePermission('payroll.write'),
  asyncHandler(async (req, res) => {
    const data = await upsertEmployeeProfile(req.body);
    res.json({ success: true, data });
  })
);

adminRouter.get(
  '/payroll/advances',
  requirePermission('payroll.read', 'payroll.write'),
  asyncHandler(async (_req, res) => {
    const data = await listSalaryAdvances();
    res.json({ success: true, data });
  })
);

adminRouter.post(
  '/payroll/advances',
  requirePermission('payroll.write'),
  asyncHandler(async (req, res) => {
    const data = await createSalaryAdvance(req.body);
    res.status(201).json({ success: true, data });
  })
);

adminRouter.get(
  '/payroll/adjustments',
  requirePermission('payroll.read', 'payroll.write'),
  asyncHandler(async (_req, res) => {
    const data = await listPayrollAdjustments();
    res.json({ success: true, data });
  })
);

adminRouter.post(
  '/payroll/adjustments',
  requirePermission('payroll.write'),
  asyncHandler(async (req, res) => {
    const data = await createPayrollAdjustment(req.body);
    res.status(201).json({ success: true, data });
  })
);

adminRouter.delete(
  '/payroll/adjustments/:id',
  requirePermission('payroll.write'),
  asyncHandler(async (req, res) => {
    await deletePayrollAdjustment(Number(req.params.id));
    res.json({ success: true });
  })
);

adminRouter.get(
  '/payroll/periods',
  requirePermission('payroll.read', 'payroll.write'),
  asyncHandler(async (_req, res) => {
    const data = await listPayrollPeriods();
    res.json({ success: true, data });
  })
);

adminRouter.post(
  '/payroll/periods',
  requirePermission('payroll.write'),
  asyncHandler(async (req, res) => {
    const data = await createPayrollPeriod(req.body);
    res.status(201).json({ success: true, data });
  })
);

adminRouter.patch(
  '/payroll/periods/:id/status',
  requirePermission('payroll.write'),
  asyncHandler(async (req, res) => {
    const data = await updatePayrollPeriodStatus(Number(req.params.id), req.body.status);
    res.json({ success: true, data });
  })
);

adminRouter.put(
  '/payroll/entries/:id',
  requirePermission('payroll.write'),
  asyncHandler(async (req, res) => {
    const data = await updatePayrollEntry(Number(req.params.id), req.body);
    res.json({ success: true, data });
  })
);

adminRouter.post(
  '/payroll/entries/:id/payments',
  requirePermission('payroll.write'),
  asyncHandler(async (req, res) => {
    const data = await createPayrollPayment(Number(req.params.id), req.body);
    res.status(201).json({ success: true, data });
  })
);
