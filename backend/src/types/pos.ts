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

export interface Product {
  id: number;
  name: string;
  category: string;
  categoryId: number | null;
  price: number;
  color: string;
  icon: string;
  image: string | null;
  estimatedCost: number;
}

export interface AuthUserSummary {
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
  user: AuthUserSummary;
}

export interface RoleSummary {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionSummary[];
  usersCount: number;
}

export interface PermissionSummary {
  id: number;
  code: string;
  label: string;
  module: string;
  description: string | null;
}

export interface StaffUserSummary {
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

export interface RestaurantTableSummary {
  id: number;
  name: string;
  zone: string | null;
  capacity: number;
  isActive: boolean;
}

export interface RestaurantSettingsSummary {
  restaurantName: string;
  currency: string;
  defaultDeliveryFee: number;
  lowStockThreshold: number;
  receiptFooter: string | null;
}

export interface InventoryItemSummary {
  id: number;
  name: string;
  category: string;
  measurementType: MeasurementType;
  unit: MeasurementUnit;
  quantity: number;
  estimatedCost: number;
  minimumStock: number | null;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface InventoryCategorySummary {
  id: number;
  name: string;
  description: string | null;
  itemsCount: number;
}

export interface RecipeIngredientSummary {
  inventoryItemId: number;
  inventoryItemName: string;
  amountUsed: number;
  unit: MeasurementUnit;
}

export interface MenuItemSummary {
  id: number;
  name: string;
  category: string;
  categoryId: number | null;
  image: string | null;
  color: string;
  icon: string;
  estimatedCost: number;
  sellingPrice: number;
  profit: number;
  margin: number;
  ingredients: RecipeIngredientSummary[];
}

export interface MenuCategorySummary {
  id: number;
  name: string;
  description: string | null;
  itemsCount: number;
}

export interface OrderItemInput {
  productId: number;
  quantity: number;
}

export interface CreateOrderInput {
  type: OrderType;
  status?: OrderStatus;
  tableNumber?: string | null;
  customerName?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  deliveryFee?: number;
  deliveryStatus?: DeliveryStatus | null;
  items: OrderItemInput[];
}

export interface OrderSummary {
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
  items: Array<{
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}
