export type OrderType = 'dine_in' | 'take_away' | 'delivery';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'paid' | 'cancelled';
export type DeliveryStatus = 'pending' | 'on_the_way' | 'delivered';
export type PaymentMethod = 'cash' | 'card';
export type UserStatus = 'active' | 'disabled';
export type ExpenseType = 'fixed' | 'variable' | 'exceptional';
export type ExpenseStatus = 'planned' | 'partial' | 'paid' | 'cancelled';
export type FinancePaymentMethod = 'cash' | 'card' | 'transfer';
export type ExpenseSourceType = 'manual' | 'stock_purchase' | 'payroll_payment' | 'salary_advance';
export type EmploymentType = 'monthly' | 'daily' | 'hourly';
export type PayrollPeriodStatus = 'draft' | 'validated' | 'paid';
export type MeasurementType = 'portion' | 'weight' | 'volume';
export type InventoryUsageType = 'recipe_only' | 'direct_sale' | 'both';
export type ProductSourceType = 'recipe' | 'direct_stock';
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
  sourceType: ProductSourceType;
  stockItemId: number | null;
  saleUnitQuantity: number;
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
  logoUrl: string | null;
  receiptTitle: string;
  receiptSubtitle: string | null;
  receiptAddress: string | null;
  receiptPhone: string | null;
  receiptEmail: string | null;
  receiptWebsite: string | null;
  receiptFacebook: string | null;
  receiptInstagram: string | null;
  receiptTiktok: string | null;
  receiptWhatsapp: string | null;
  receiptFooter: string | null;
  receiptAdditionalNote: string | null;
  kitchenTicketHeader: string | null;
  kitchenTicketFooter: string | null;
  showContactBlock: boolean;
  showSocialLinks: boolean;
  showFooterNote: boolean;
  showLogoInKitchenTicket: boolean;
  autoPrintKitchenTicket: boolean;
}

export interface ExpenseCategorySummary {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  expensesCount: number;
}

export interface ExpenseSummary {
  id: number;
  amount: number;
  category: string;
  categoryId: number | null;
  type: ExpenseType;
  status: ExpenseStatus;
  paymentMethod: FinancePaymentMethod | null;
  supplierName: string | null;
  description: string | null;
  sourceType: ExpenseSourceType;
  sourceId: number | null;
  sourceLabel: string | null;
  isSystemGenerated: boolean;
  dueDate: string | null;
  paidAt: string | null;
  date: string;
}

export interface EmployeeProfileSummary {
  id: number;
  userId: number;
  fullName: string;
  username: string;
  roleName: string;
  position: string | null;
  employmentType: EmploymentType;
  baseSalary: number;
  hireDate: string | null;
  isActive: boolean;
  payrollNotes: string | null;
}

export interface SalaryAdvanceSummary {
  id: number;
  employeeId: number;
  employeeName: string;
  amount: number;
  remainingAmount: number;
  reason: string;
  note: string | null;
  date: string;
}

export interface PayrollPaymentSummary {
  id: number;
  amount: number;
  method: FinancePaymentMethod;
  paidAt: string;
  note: string | null;
}

export interface PayrollEntrySummary {
  id: number;
  employeeId: number;
  employeeName: string;
  position: string | null;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  advanceDeduction: number;
  netSalary: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  notes: string | null;
  payments: PayrollPaymentSummary[];
}

export interface PayrollPeriodSummary {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
  status: PayrollPeriodStatus;
  notes: string | null;
  payrollTotal: number;
  paidTotal: number;
  remainingTotal: number;
  entries: PayrollEntrySummary[];
}

export interface ReportFilters {
  period: 'today' | '7d' | '30d' | 'custom';
  dateFrom?: string;
  dateTo?: string;
}

export interface InventoryItemSummary {
  id: number;
  name: string;
  category: string;
  measurementType: MeasurementType;
  unit: MeasurementUnit;
  usageType: InventoryUsageType;
  quantity: number;
  estimatedCost: number;
  minimumStock: number | null;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  directSale: {
    productId: number;
    sellingPrice: number;
    category: string;
    categoryId: number | null;
    saleUnitQuantity: number;
    isActive: boolean;
  } | null;
}

export interface InventoryCategorySummary {
  id: number;
  name: string;
  description: string | null;
  itemsCount: number;
}

export interface StockMovementSummary {
  id: number;
  ingredientId: number;
  ingredientName: string;
  category: string;
  type: 'IN' | 'OUT';
  reason: 'purchase' | 'sale' | 'loss' | 'adjustment';
  quantity: number;
  unit: MeasurementUnit;
  date: string;
  createdAt: string;
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
  sourceType: ProductSourceType;
  stockItemId: number | null;
  saleUnitQuantity: number;
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
