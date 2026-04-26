export type ModuleId = 'apps' | 'inventory' | 'pos' | 'recipes' | 'sales' | 'reports' | 'settings';
export type PosScreen = 'order' | 'kitchen' | 'cashier' | 'delivery';
export type OrderType = 'dine_in' | 'take_away' | 'delivery';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'paid' | 'cancelled';
export type DeliveryStatus = 'pending' | 'on_the_way' | 'delivered';
export type PaymentMethod = 'cash' | 'card';
export type UserStatus = 'active' | 'disabled';
export type MeasurementType = 'portion' | 'weight' | 'volume';
export type MeasurementUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'liter'
  | 'piece'
  | 'slice'
  | 'bottle'
  | 'pack'
  | 'portion';
export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: number;
  name: string;
  category: string;
  categoryId: number | null;
  price: number;
  color: string;
  icon: string;
  image?: string | null;
  estimatedCost: number;
}

export interface AuthUser {
  id: number;
  fullName: string;
  username: string;
  email: string | null;
  status: UserStatus;
  roleId: number;
  roleName: string;
  permissions: string[];
}

export interface AuthLoginResponse {
  token: string;
  user: AuthUser;
}

export interface Permission {
  id: number;
  code: string;
  label: string;
  module: string;
  description: string | null;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  usersCount: number;
  permissions: Permission[];
}

export interface StaffUser {
  id: number;
  fullName: string;
  username: string;
  email: string | null;
  status: UserStatus;
  roleId: number;
  roleName: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface StaffUserInput {
  id?: number;
  fullName: string;
  username: string;
  email?: string | null;
  password?: string;
  roleId: number;
  status: UserStatus;
}

export interface RestaurantTable {
  id: number;
  name: string;
  zone: string | null;
  capacity: number;
  isActive: boolean;
}

export interface RestaurantTableInput {
  id?: number;
  name: string;
  zone?: string | null;
  capacity: number;
  isActive: boolean;
}

export interface RestaurantSettings {
  restaurantName: string;
  currency: string;
  defaultDeliveryFee: number;
  lowStockThreshold: number;
  receiptFooter: string | null;
}

export interface ProfitReport {
  totals: {
    sales: number;
    netProfit: number;
    activeOrders: number;
  };
  stockAlerts: Array<{
    ingredientId: number;
    name: string;
    currentStock: number;
    purchasePrice: number;
  }>;
}

export interface StockRow {
  ingredientId: number;
  name: string;
  currentStock: number;
  purchasePrice: number;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  tableNumber: string | null;
  customerName: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  deliveryFee: number;
  deliveryStatus: DeliveryStatus | null;
  totalPrice: number;
  createdAt: string;
  items: OrderItem[];
}

export interface DashboardData {
  cards: {
    totalSalesToday: number;
    profitToday: number;
    activeOrders: number;
    lowStockAlerts: number;
  };
  charts: {
    salesPerDay: Array<{ date: string; ordersCount: number; totalSales: number }>;
    topSellingProducts: Array<{ productId: number; name: string; totalQuantity: number; revenue: number }>;
  };
  stockAlerts: Array<{ ingredientId: number; name: string; currentStock: number; purchasePrice: number }>;
}

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  icon: string;
  color: string;
}

export interface DeliveryForm {
  customerName: string;
  phone: string;
  address: string;
  deliveryFee: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  measurementType: MeasurementType;
  unit: MeasurementUnit;
  quantity: number;
  estimatedCost: number;
  minimumStock: number | null;
  status: InventoryStatus;
}

export interface InventoryCategory {
  id: number;
  name: string;
  description: string | null;
  itemsCount: number;
}

export interface InventoryItemInput {
  id?: number;
  name: string;
  category: string;
  unit: MeasurementUnit;
  measurementType?: MeasurementType;
  estimatedCost?: number;
  initialQuantity?: number;
  initialTotalPrice?: number;
  minimumStock?: number | null;
}

export interface StockEntryInput {
  ingredientId: number;
  quantity: number;
  totalPrice: number;
  date?: string | null;
}

export interface RecipeIngredientInput {
  inventoryItemId: number;
  amountUsed: number;
  unit: MeasurementUnit;
}

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  categoryId: number | null;
  image: string | null;
  ingredients: RecipeIngredientInput[];
  estimatedCost: number;
  sellingPrice: number;
  profit: number;
  margin: number;
}

export interface MenuCategory {
  id: number;
  name: string;
  description: string | null;
  itemsCount: number;
}

export interface MenuItemInput {
  id?: number;
  name: string;
  category?: string;
  categoryId?: number | null;
  image?: string | null;
  estimatedCost: number;
  sellingPrice: number;
  ingredients: RecipeIngredientInput[];
}
