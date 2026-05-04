import axios, { InternalAxiosRequestConfig } from 'axios';
import {
  AuthLoginResponse,
  AuthUser,
  CashSession,
  CashSessionInput,
  DashboardData,
  EmployeeProfile,
  EmployeeProfileInput,
  Expense,
  ExpenseCategory,
  ExpenseInput,
  PayrollEntryInput,
  PayrollAdjustment,
  PayrollAdjustmentInput,
  PayrollPaymentInput,
  PayrollPeriod,
  PayrollPeriodInput,
  InventoryCategory,
  InventoryItem,
  InventoryItemInput,
  MenuCategory,
  MenuItem,
  MenuItemInput,
  MarkOrderLostInput,
  Order,
  Permission,
  Product,
  ProfitReport,
  ReportFilters,
  RestaurantSettings,
  RestaurantTable,
  RestaurantTableInput,
  Role,
  SalaryAdvance,
  SalaryAdvanceInput,
  StockEntryInput,
  StockLossInput,
  StockMovement,
  StockRow,
  StaffUser,
  StaffUserInput
} from '../types/pos';

const api = axios.create({
  baseURL: '/api'
});

type BlockingAxiosConfig = InternalAxiosRequestConfig & { __blocksUi?: boolean };

let pendingMutations = 0;

function isMutationRequest(config: InternalAxiosRequestConfig) {
  const method = (config.method ?? 'get').toLowerCase();
  return ['post', 'put', 'patch', 'delete'].includes(method);
}

function emitMutationState() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('restaurant-pos:backend-busy', {
      detail: {
        pending: pendingMutations
      }
    })
  );
}

function finishMutation(config?: BlockingAxiosConfig) {
  if (!config?.__blocksUi) return;
  pendingMutations = Math.max(0, pendingMutations - 1);
  emitMutationState();
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('restaurant-pos-auth-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (isMutationRequest(config)) {
    (config as BlockingAxiosConfig).__blocksUi = true;
    pendingMutations += 1;
    emitMutationState();
  }
  return config;
});

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.message ?? error.message);
  }
  return error instanceof Error ? error.message : 'Erreur API';
}

api.interceptors.response.use(
  (response) => {
    finishMutation(response.config as BlockingAxiosConfig);
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      finishMutation(error.config as BlockingAxiosConfig | undefined);
    }
    return Promise.reject(new Error(getErrorMessage(error)));
  }
);

export async function login(payload: { login: string; password: string }) {
  const response = await api.post<{ success: boolean; data: AuthLoginResponse }>('/auth/login', payload);
  return response.data.data;
}

export async function fetchCurrentUser() {
  const response = await api.get<{ success: boolean; data: AuthUser }>('/auth/me');
  return response.data.data;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function fetchProducts() {
  const response = await api.get<{ success: boolean; data: { categories: string[]; products: Product[] } }>('/products');
  return response.data.data;
}

export async function fetchOrders() {
  const response = await api.get<{ success: boolean; data: Order[] }>('/orders');
  return response.data.data;
}

export async function fetchKitchenOrders() {
  const response = await api.get<{ success: boolean; data: Order[] }>('/kitchen');
  return response.data.data;
}

function reportQuery(filters?: Partial<ReportFilters>) {
  return {
    params: {
      period: filters?.period ?? '7d',
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo
    }
  };
}

export async function fetchDashboard(filters?: Partial<ReportFilters>) {
  const response = await api.get<{ success: boolean; data: DashboardData }>('/dashboard', reportQuery(filters));
  return response.data.data;
}

export async function fetchProfitReport(filters?: Partial<ReportFilters>) {
  const response = await api.get<{ success: boolean; data: ProfitReport }>('/reports/profit', reportQuery(filters));
  return response.data.data;
}

export async function fetchStock() {
  const response = await api.get<{ success: boolean; data: StockRow[] }>('/stock');
  return response.data.data;
}

export async function fetchInventoryItems() {
  const response = await api.get<{ success: boolean; data: InventoryItem[] }>('/inventory');
  return response.data.data;
}

export async function fetchInventoryCategories() {
  const response = await api.get<{ success: boolean; data: InventoryCategory[] }>('/inventory/categories');
  return response.data.data;
}

export async function fetchStockMovements(limit = 120) {
  const response = await api.get<{ success: boolean; data: StockMovement[] }>('/inventory/movements', {
    params: { limit }
  });
  return response.data.data;
}

export async function createInventoryCategory(payload: { name: string; description?: string | null; usageType?: InventoryCategory['usageType'] }) {
  const response = await api.post<{ success: boolean; data: InventoryCategory }>('/inventory/categories', payload);
  return response.data.data;
}

export async function deleteInventoryCategory(id: number) {
  await api.delete(`/inventory/categories/${id}`);
}

export async function createInventoryItem(payload: InventoryItemInput) {
  const response = await api.post<{ success: boolean; data: InventoryItem }>('/inventory', payload);
  return response.data.data;
}

export async function updateInventoryItem(id: number, payload: InventoryItemInput) {
  const response = await api.put<{ success: boolean; data: InventoryItem }>(`/inventory/${id}`, payload);
  return response.data.data;
}

export async function createStockEntry(payload: StockEntryInput) {
  const response = await api.post<{ success: boolean; data: InventoryItem }>('/inventory/entries', payload);
  return response.data.data;
}

export async function createStockLoss(payload: StockLossInput) {
  const response = await api.post<{ success: boolean; data: InventoryItem }>('/inventory/losses', payload);
  return response.data.data;
}

export async function deleteInventoryItem(id: number) {
  await api.delete(`/inventory/${id}`);
}

export async function fetchMenuItems() {
  const response = await api.get<{ success: boolean; data: MenuItem[] }>('/menu-items');
  return response.data.data;
}

export async function fetchMenuCategories() {
  const response = await api.get<{ success: boolean; data: MenuCategory[] }>('/menu-items/categories');
  return response.data.data;
}

export async function createMenuCategory(payload: { name: string; description?: string | null }) {
  const response = await api.post<{ success: boolean; data: MenuCategory }>('/menu-items/categories', payload);
  return response.data.data;
}

export async function deleteMenuCategory(id: number) {
  await api.delete(`/menu-items/categories/${id}`);
}

export async function createMenuItem(payload: MenuItemInput) {
  const response = await api.post<{ success: boolean; data: MenuItem }>('/menu-items', payload);
  return response.data.data;
}

export async function updateMenuItem(id: number, payload: MenuItemInput) {
  const response = await api.put<{ success: boolean; data: MenuItem }>(`/menu-items/${id}`, payload);
  return response.data.data;
}

export async function deleteMenuItem(id: number) {
  await api.delete(`/menu-items/${id}`);
}

export async function createOrder(payload: unknown) {
  const response = await api.post<{ success: boolean; data: Order }>('/orders', payload);
  return response.data.data;
}

export async function updateOrderStatus(orderId: number, status: string) {
  const response = await api.patch<{ success: boolean; data: Order }>(`/orders/${orderId}/status`, { status });
  return response.data.data;
}

export async function cancelOrder(orderId: number) {
  const response = await api.patch<{ success: boolean; data: Order }>(`/orders/${orderId}/cancel`);
  return response.data.data;
}

export async function markOrderLost(orderId: number, payload: MarkOrderLostInput) {
  const response = await api.patch<{ success: boolean; data: Order }>(`/orders/${orderId}/lost`, payload);
  return response.data.data;
}

export async function updateDeliveryStatus(orderId: number, deliveryStatus: string) {
  const response = await api.patch<{ success: boolean; data: Order }>(`/orders/${orderId}/delivery-status`, { deliveryStatus });
  return response.data.data;
}

export async function createPayment(orderId: number, method: 'cash' | 'card') {
  const response = await api.post<{ success: boolean; data: Order }>('/payments', { orderId, method });
  return response.data.data;
}

export async function fetchStaffUsers() {
  const response = await api.get<{ success: boolean; data: StaffUser[] }>('/admin/users');
  return response.data.data;
}

export async function createStaffUser(payload: StaffUserInput) {
  const response = await api.post<{ success: boolean; data: StaffUser }>('/admin/users', payload);
  return response.data.data;
}

export async function updateStaffUser(id: number, payload: StaffUserInput) {
  const response = await api.put<{ success: boolean; data: StaffUser }>(`/admin/users/${id}`, payload);
  return response.data.data;
}

export async function resetStaffPassword(id: number, password: string) {
  await api.patch(`/admin/users/${id}/password`, { password });
}

export async function fetchRoles() {
  const response = await api.get<{ success: boolean; data: Role[] }>('/admin/roles');
  return response.data.data;
}

export async function fetchPermissions() {
  const response = await api.get<{ success: boolean; data: Permission[] }>('/admin/permissions');
  return response.data.data;
}

export async function updateRolePermissions(roleId: number, permissions: string[]) {
  const response = await api.put<{ success: boolean; data: Role }>(`/admin/roles/${roleId}/permissions`, { permissions });
  return response.data.data;
}

export async function fetchTables() {
  const response = await api.get<{ success: boolean; data: RestaurantTable[] }>('/admin/tables');
  return response.data.data;
}

export async function createTable(payload: RestaurantTableInput) {
  const response = await api.post<{ success: boolean; data: RestaurantTable }>('/admin/tables', payload);
  return response.data.data;
}

export async function updateTable(id: number, payload: RestaurantTableInput) {
  const response = await api.put<{ success: boolean; data: RestaurantTable }>(`/admin/tables/${id}`, payload);
  return response.data.data;
}

export async function deleteTable(id: number) {
  await api.delete(`/admin/tables/${id}`);
}

export async function fetchSettings() {
  const response = await api.get<{ success: boolean; data: RestaurantSettings }>('/admin/settings');
  return response.data.data;
}

export async function updateSettings(payload: RestaurantSettings) {
  const response = await api.put<{ success: boolean; data: RestaurantSettings }>('/admin/settings', payload);
  return response.data.data;
}

export async function fetchExpenseCategories() {
  const response = await api.get<{ success: boolean; data: ExpenseCategory[] }>('/admin/finance/categories');
  return response.data.data;
}

export async function createExpenseCategory(payload: { name: string; description?: string | null }) {
  const response = await api.post<{ success: boolean; data: ExpenseCategory }>('/admin/finance/categories', payload);
  return response.data.data;
}

export async function deleteExpenseCategory(id: number) {
  await api.delete(`/admin/finance/categories/${id}`);
}

export async function fetchExpenses() {
  const response = await api.get<{ success: boolean; data: Expense[] }>('/admin/finance/expenses');
  return response.data.data;
}

export async function createExpense(payload: ExpenseInput) {
  const response = await api.post<{ success: boolean; data: Expense }>('/admin/finance/expenses', payload);
  return response.data.data;
}

export async function updateExpense(id: number, payload: ExpenseInput) {
  const response = await api.put<{ success: boolean; data: Expense }>(`/admin/finance/expenses/${id}`, payload);
  return response.data.data;
}

export async function deleteExpense(id: number) {
  await api.delete(`/admin/finance/expenses/${id}`);
}

export async function fetchCashSessions() {
  const response = await api.get<{ success: boolean; data: CashSession[] }>('/admin/finance/cash-sessions');
  return response.data.data;
}

export async function upsertCashSession(payload: CashSessionInput) {
  const response = payload.id
    ? await api.put<{ success: boolean; data: CashSession }>(`/admin/finance/cash-sessions/${payload.id}`, payload)
    : await api.post<{ success: boolean; data: CashSession }>('/admin/finance/cash-sessions', payload);
  return response.data.data;
}

export async function deleteCashSession(id: number) {
  await api.delete(`/admin/finance/cash-sessions/${id}`);
}

export async function fetchEmployeeProfiles() {
  const response = await api.get<{ success: boolean; data: EmployeeProfile[] }>('/admin/payroll/employees');
  return response.data.data;
}

export async function upsertEmployeeProfile(payload: EmployeeProfileInput) {
  const response = await api.put<{ success: boolean; data: EmployeeProfile }>('/admin/payroll/employees', payload);
  return response.data.data;
}

export async function fetchSalaryAdvances() {
  const response = await api.get<{ success: boolean; data: SalaryAdvance[] }>('/admin/payroll/advances');
  return response.data.data;
}

export async function createSalaryAdvance(payload: SalaryAdvanceInput) {
  const response = await api.post<{ success: boolean; data: SalaryAdvance }>('/admin/payroll/advances', payload);
  return response.data.data;
}

export async function fetchPayrollAdjustments() {
  const response = await api.get<{ success: boolean; data: PayrollAdjustment[] }>('/admin/payroll/adjustments');
  return response.data.data;
}

export async function createPayrollAdjustment(payload: PayrollAdjustmentInput) {
  const response = await api.post<{ success: boolean; data: PayrollAdjustment }>('/admin/payroll/adjustments', payload);
  return response.data.data;
}

export async function deletePayrollAdjustment(id: number) {
  await api.delete(`/admin/payroll/adjustments/${id}`);
}

export async function fetchPayrollPeriods() {
  const response = await api.get<{ success: boolean; data: PayrollPeriod[] }>('/admin/payroll/periods');
  return response.data.data;
}

export async function createPayrollPeriod(payload: PayrollPeriodInput) {
  const response = await api.post<{ success: boolean; data: PayrollPeriod }>('/admin/payroll/periods', payload);
  return response.data.data;
}

export async function updatePayrollPeriodStatus(id: number, status: 'draft' | 'validated' | 'paid') {
  const response = await api.patch<{ success: boolean; data: PayrollPeriod }>(`/admin/payroll/periods/${id}/status`, { status });
  return response.data.data;
}

export async function updatePayrollEntry(id: number, payload: PayrollEntryInput) {
  const response = await api.put<{ success: boolean; data: PayrollPeriod }>(`/admin/payroll/entries/${id}`, payload);
  return response.data.data;
}

export async function createPayrollPayment(id: number, payload: PayrollPaymentInput) {
  const response = await api.post<{ success: boolean; data: PayrollPeriod }>(`/admin/payroll/entries/${id}/payments`, payload);
  return response.data.data;
}
