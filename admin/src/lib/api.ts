import axios from 'axios';
import {
  AuthLoginResponse,
  AuthUser,
  DashboardData,
  InventoryCategory,
  InventoryItem,
  InventoryItemInput,
  MenuCategory,
  MenuItem,
  MenuItemInput,
  Order,
  Permission,
  Product,
  ProfitReport,
  RestaurantSettings,
  RestaurantTable,
  RestaurantTableInput,
  Role,
  StockEntryInput,
  StockRow,
  StaffUser,
  StaffUserInput
} from '../types/pos';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('restaurant-pos-auth-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
  (response) => response,
  (error) => Promise.reject(new Error(getErrorMessage(error)))
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

export async function fetchDashboard() {
  const response = await api.get<{ success: boolean; data: DashboardData }>('/dashboard');
  return response.data.data;
}

export async function fetchProfitReport() {
  const response = await api.get<{ success: boolean; data: ProfitReport }>('/reports/profit');
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

export async function createInventoryCategory(payload: { name: string; description?: string | null }) {
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
