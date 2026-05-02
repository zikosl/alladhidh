export type ModuleId = 'apps' | 'inventory' | 'pos' | 'recipes' | 'sales' | 'reports' | 'finance' | 'payroll' | 'settings';
export type PosScreen = 'order' | 'kitchen' | 'cashier' | 'delivery';
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
  sourceType: ProductSourceType;
  stockItemId: number | null;
  saleUnitQuantity: number;
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

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  expensesCount: number;
}

export interface Expense {
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

export interface ExpenseInput {
  id?: number;
  amount: number;
  categoryId?: number | null;
  type: ExpenseType;
  status: ExpenseStatus;
  paymentMethod?: FinancePaymentMethod | null;
  supplierName?: string | null;
  description?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  date?: string | null;
}

export interface EmployeeProfile {
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

export interface EmployeeProfileInput {
  id?: number;
  userId: number;
  position?: string | null;
  employmentType: EmploymentType;
  baseSalary: number;
  hireDate?: string | null;
  isActive: boolean;
  payrollNotes?: string | null;
}

export interface SalaryAdvance {
  id: number;
  employeeId: number;
  employeeName: string;
  amount: number;
  remainingAmount: number;
  reason: string;
  note: string | null;
  date: string;
}

export interface SalaryAdvanceInput {
  employeeId: number;
  amount: number;
  reason: string;
  method?: FinancePaymentMethod;
  note?: string | null;
  date?: string | null;
}

export interface PayrollPayment {
  id: number;
  amount: number;
  method: FinancePaymentMethod;
  paidAt: string;
  note: string | null;
}

export interface PayrollEntry {
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
  payments: PayrollPayment[];
}

export interface PayrollPeriod {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
  status: PayrollPeriodStatus;
  notes: string | null;
  payrollTotal: number;
  paidTotal: number;
  remainingTotal: number;
  entries: PayrollEntry[];
}

export interface PayrollPeriodInput {
  label: string;
  startDate: string;
  endDate: string;
  notes?: string | null;
}

export interface PayrollEntryInput {
  baseSalary: number;
  bonuses: number;
  deductions: number;
  advanceDeduction: number;
  notes?: string | null;
}

export interface PayrollPaymentInput {
  amount: number;
  method: FinancePaymentMethod;
  paidAt?: string | null;
  note?: string | null;
}

export interface ProfitReport {
  totals: {
    sales: number;
    netProfit: number;
    activeOrders: number;
    estimatedCosts: number;
    expenses: number;
    cashBenefit: number;
    cashRevenue: number;
    cashOut: number;
    payroll: number;
    losses: number;
    averageTicket: number;
    previousSales: number;
    previousNetProfit: number;
  };
  margins: {
    bestProducts: Array<{ productId: number; name: string; revenue: number; estimatedProfit: number; marginRate: number }>;
    weakestProducts: Array<{ productId: number; name: string; revenue: number; estimatedProfit: number; marginRate: number }>;
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

export interface StockMovement {
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
    cashBenefitToday: number;
    activeOrders: number;
    lowStockAlerts: number;
    averageTicketToday: number;
    lossesToday: number;
    salesChangePct: number;
    profitChangePct: number;
    cashBenefitChangePct: number;
  };
  charts: {
    salesPerDay: Array<{ date: string; ordersCount: number; totalSales: number }>;
    cashBenefitPerDay: Array<{
      date: string;
      sales: number;
      cashIn: number;
      cashOut: number;
      manualExpenses: number;
      stockPurchases: number;
      payrollPaid: number;
      salaryAdvances: number;
      cashBenefit: number;
    }>;
    topSellingProducts: Array<{ productId: number; name: string; totalQuantity: number; revenue: number }>;
    salesByType: Array<{ type: OrderType; ordersCount: number; totalSales: number }>;
    salesByHour: Array<{ hour: string; ordersCount: number; totalSales: number }>;
  };
  stockAlerts: Array<{ ingredientId: number; name: string; currentStock: number; purchasePrice: number }>;
  operations: {
    statusBreakdown: Array<{ status: OrderStatus; count: number }>;
    averagePreparationMinutes: number;
    averagePaymentMinutes: number;
    delayedOrders: number;
    averageDeliveryMinutes: number;
    delayedDeliveries: number;
  };
  stockInsights: {
    stockValue: number;
    totalLossValue: number;
    lossesByIngredient: Array<{ ingredientId: number; name: string; quantity: number; value: number }>;
    topConsumedIngredients: Array<{ ingredientId: number; name: string; quantity: number }>;
  };
  financials: {
    expensesByCategory: Array<{ category: string; amount: number }>;
    expenseTotal: number;
    manualExpenseTotal: number;
    stockPurchaseTotal: number;
    payrollAccruedTotal: number;
    payrollPaidTotal: number;
    payrollPaymentExpenseTotal: number;
    salaryAdvanceTotal: number;
    payrollOutstandingTotal: number;
    cashRevenueTotal: number;
    cashOutTotal: number;
    cashBenefitTotal: number;
    payrollByEmployee: Array<{ employeeId: number; employeeName: string; payrollTotal: number; paidTotal: number }>;
    estimatedCostsTotal: number;
  };
  delivery: {
    totalOrders: number;
    revenue: number;
    averageFee: number;
    byStatus: Array<{ status: DeliveryStatus; count: number }>;
  };
  tables: {
    activeDineInOrders: number;
    revenueByTable: Array<{ tableNumber: string; ordersCount: number; totalSales: number }>;
  };
}

export interface ReportFilters {
  period: 'today' | '7d' | '30d' | 'custom';
  dateFrom?: string;
  dateTo?: string;
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
  usageType: InventoryUsageType;
  quantity: number;
  estimatedCost: number;
  minimumStock: number | null;
  status: InventoryStatus;
  directSale: {
    productId: number;
    sellingPrice: number;
    category: string;
    categoryId: number | null;
    saleUnitQuantity: number;
    isActive: boolean;
  } | null;
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
  usageType?: InventoryUsageType;
  measurementType?: MeasurementType;
  estimatedCost?: number;
  initialQuantity?: number;
  initialTotalPrice?: number;
  minimumStock?: number | null;
  directSale?: {
    enabled: boolean;
    sellingPrice: number;
    category?: string;
    categoryId?: number | null;
    saleUnitQuantity?: number;
  };
}

export interface StockEntryInput {
  ingredientId: number;
  quantity: number;
  totalPrice: number;
  expenseStatus?: ExpenseStatus;
  paymentMethod?: FinancePaymentMethod;
  supplierName?: string | null;
  date?: string | null;
}

export interface StockLossInput {
  ingredientId: number;
  quantity: number;
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
  sourceType: ProductSourceType;
  stockItemId: number | null;
  saleUnitQuantity: number;
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
  sourceType?: ProductSourceType;
  stockItemId?: number | null;
  saleUnitQuantity?: number;
}
