import { create } from 'zustand';
import {
  cancelOrder as cancelOrderRequest,
  createPayrollAdjustment,
  createExpense,
  createExpenseCategory,
  createPayrollPayment,
  createPayrollPeriod,
  createSalaryAdvance,
  createStaffUser,
  createTable,
  createInventoryCategory,
  createInventoryItem,
  createMenuCategory,
  createStockEntry,
  createStockLoss,
  deleteCashSession,
  deleteExpense,
  deleteExpenseCategory,
  deletePayrollAdjustment,
  deleteTable,
  deleteInventoryCategory,
  deleteInventoryItem,
  createMenuItem,
  createOrder,
  createPayment,
  deleteMenuCategory,
  fetchEmployeeProfiles,
  fetchCashSessions,
  fetchExpenseCategories,
  fetchExpenses,
  fetchDashboard,
  fetchInventoryCategories,
  fetchInventoryItems,
  fetchPermissions,
  fetchMenuCategories,
  fetchKitchenOrders,
  fetchMenuItems,
  fetchOrders,
  fetchPayrollPeriods,
  fetchPayrollAdjustments,
  fetchProfitReport,
  fetchProducts,
  fetchRoles,
  fetchSalaryAdvances,
  fetchSettings,
  fetchStock,
  fetchStockMovements,
  fetchStaffUsers,
  fetchTables,
  resetStaffPassword,
  updateExpense,
  updatePayrollEntry,
  updatePayrollPeriodStatus,
  updateRolePermissions,
  updateSettings,
  updateStaffUser,
  updateTable,
  upsertCashSession,
  upsertEmployeeProfile,
  updateDeliveryStatus,
  updateInventoryItem,
  deleteMenuItem,
  updateMenuItem,
  updateOrderStatus
} from '../lib/api';
import { initialInventoryItems, initialMenuItems } from '../lib/mockData';
import { resolveNavigationPath, writeNavigationPath } from '../lib/navigation';
import { printCustomerInvoice } from '../lib/print';
import {
  Permission,
  CartItem,
  CashSession,
  CashSessionInput,
  DashboardData,
  DeliveryForm,
  EmployeeProfile,
  EmployeeProfileInput,
  Expense,
  ExpenseCategory,
  ExpenseInput,
  InventoryCategory,
  InventoryItem,
  InventoryItemInput,
  InventoryStatus,
  InventoryUsageType,
  MenuCategory,
  MenuItem,
  MenuItemInput,
  ModuleId,
  Order,
  OrderType,
  PosScreen,
  Product,
  ProfitReport,
  PayrollAdjustment,
  PayrollAdjustmentInput,
  PayrollEntryInput,
  PayrollPaymentInput,
  PayrollPeriod,
  PayrollPeriodInput,
  RestaurantSettings,
  RestaurantTable,
  RestaurantTableInput,
  Role,
  SalaryAdvance,
  SalaryAdvanceInput,
  StockEntryInput,
  StockLossInput,
  StockMovement,
  StaffUser,
  StaffUserInput,
  StockRow
} from '../types/pos';
import { useAuthStore } from './useAuthStore';

interface PosState {
  currentModule: ModuleId;
  posScreen: PosScreen;
  categories: string[];
  products: Product[];
  orders: Order[];
  kitchenOrders: Order[];
  dashboard: DashboardData | null;
  profitReport: ProfitReport | null;
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  cashSessions: CashSession[];
  employeeProfiles: EmployeeProfile[];
  salaryAdvances: SalaryAdvance[];
  payrollAdjustments: PayrollAdjustment[];
  payrollPeriods: PayrollPeriod[];
  stockRows: StockRow[];
  stockMovements: StockMovement[];
  inventoryItems: InventoryItem[];
  inventoryCategories: InventoryCategory[];
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  restaurantTables: RestaurantTable[];
  restaurantSettings: RestaurantSettings | null;
  staffUsers: StaffUser[];
  roles: Role[];
  permissions: Permission[];
  selectedCategory: string;
  search: string;
  cart: CartItem[];
  orderType: OrderType;
  tableNumber: string;
  notes: string;
  deliveryForm: DeliveryForm;
  loading: boolean;
  submitting: boolean;
  lastError: string | null;
  setCurrentModule: (module: ModuleId) => void;
  setPosScreen: (screen: PosScreen) => void;
  syncNavigationFromUrl: () => void;
  setSearch: (value: string) => void;
  setSelectedCategory: (value: string) => void;
  setOrderType: (value: OrderType) => void;
  setTableNumber: (value: string) => void;
  setNotes: (value: string) => void;
  setDeliveryForm: (patch: Partial<DeliveryForm>) => void;
  addToCart: (product: Product) => void;
  increaseItem: (productId: number) => void;
  decreaseItem: (productId: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  holdCart: () => void;
  restoreHeldCart: () => void;
  upsertInventoryItem: (item: InventoryItemInput) => Promise<void>;
  addInventoryCategory: (category: { name: string; description?: string | null; usageType?: InventoryUsageType }) => Promise<void>;
  removeInventoryCategory: (id: number) => Promise<void>;
  addStockEntry: (entry: StockEntryInput) => Promise<void>;
  addStockLoss: (loss: StockLossInput) => Promise<void>;
  upsertMenuItem: (item: MenuItemInput) => Promise<void>;
  addMenuCategory: (category: { name: string; description?: string | null }) => Promise<void>;
  removeMenuCategory: (id: number) => Promise<void>;
  removeInventoryItem: (id: number) => Promise<void>;
  removeMenuItem: (id: number) => Promise<void>;
  upsertExpense: (expense: ExpenseInput) => Promise<void>;
  removeExpense: (id: number) => Promise<void>;
  addExpenseCategory: (category: { name: string; description?: string | null }) => Promise<void>;
  removeExpenseCategory: (id: number) => Promise<void>;
  saveCashSession: (session: CashSessionInput) => Promise<void>;
  removeCashSession: (id: number) => Promise<void>;
  upsertEmployeePayrollProfile: (profile: EmployeeProfileInput) => Promise<void>;
  addSalaryAdvance: (advance: SalaryAdvanceInput) => Promise<void>;
  addPayrollAdjustment: (adjustment: PayrollAdjustmentInput) => Promise<void>;
  removePayrollAdjustment: (id: number) => Promise<void>;
  addPayrollPeriod: (period: PayrollPeriodInput) => Promise<void>;
  savePayrollEntry: (entryId: number, entry: PayrollEntryInput) => Promise<void>;
  addPayrollPayment: (entryId: number, payment: PayrollPaymentInput) => Promise<void>;
  savePayrollPeriodStatus: (periodId: number, status: 'draft' | 'validated' | 'paid') => Promise<void>;
  upsertStaffUser: (user: StaffUserInput) => Promise<void>;
  resetStaffPasswordForUser: (userId: number, password: string) => Promise<void>;
  saveRolePermissions: (roleId: number, permissionCodes: string[]) => Promise<void>;
  upsertRestaurantTable: (table: RestaurantTableInput) => Promise<void>;
  removeRestaurantTable: (id: number) => Promise<void>;
  saveRestaurantSettings: (settings: RestaurantSettings) => Promise<void>;
  hydrate: () => Promise<void>;
  refreshLiveData: () => Promise<void>;
  refreshAdminData: () => Promise<void>;
  submitOrder: () => Promise<void>;
  cancelOrder: (orderId: number) => Promise<void>;
  setKitchenStatus: (orderId: number, status: 'pending' | 'preparing' | 'ready') => Promise<void>;
  payOrder: (orderId: number, method: 'cash' | 'card') => Promise<void>;
  setDeliveryOrderStatus: (orderId: number, status: 'pending' | 'on_the_way' | 'delivered') => Promise<void>;
}

const heldCartKey = 'restaurant-pos-held-cart';
const inventoryKey = 'restaurant-modules-inventory';
const menuKey = 'restaurant-modules-menu';
const inventoryCategoriesKey = 'restaurant-modules-inventory-categories';
const menuCategoriesKey = 'restaurant-modules-menu-categories';

function computeInventoryStatus(item: Pick<InventoryItem, 'quantity' | 'minimumStock'>): InventoryStatus {
  if (item.quantity <= 0) {
    return 'out_of_stock';
  }
  if (item.minimumStock !== null && item.quantity <= item.minimumStock) {
    return 'low_stock';
  }
  return 'in_stock';
}

function loadLocalInventory() {
  const raw = localStorage.getItem(inventoryKey);
  if (!raw) return initialInventoryItems;
  try {
    const parsed = JSON.parse(raw) as InventoryItem[];
    return parsed.map((item) => ({
      ...item,
      measurementType: String(item.measurementType) === 'unit' ? 'portion' : item.measurementType,
      usageType: item.usageType ?? 'recipe_only',
      directSale: item.directSale ?? null,
      status: computeInventoryStatus(item)
    }));
  } catch {
    return initialInventoryItems;
  }
}

function loadLocalMenu() {
  const raw = localStorage.getItem(menuKey);
  if (!raw) return initialMenuItems;
  try {
    const parsed = JSON.parse(raw) as MenuItem[];
    return parsed.map((item) => ({
      ...item,
      categoryId: item.categoryId ?? null,
      sourceType: item.sourceType ?? 'recipe',
      stockItemId: item.stockItemId ?? null,
      saleUnitQuantity: item.saleUnitQuantity ?? 1
    }));
  } catch {
    return initialMenuItems;
  }
}

function mergeInventoryUsageTypes(types: InventoryUsageType[]): InventoryUsageType {
  if (types.includes('both')) return 'both';
  if (types.includes('direct_sale') && types.includes('recipe_only')) return 'both';
  if (types.includes('direct_sale')) return 'direct_sale';
  return 'recipe_only';
}

function categoriesFromInventory(items: InventoryItem[]): InventoryCategory[] {
  const names = Array.from(new Set(['General', ...items.map((item) => item.category || 'General')])).sort();
  return names.map((name, index) => ({
    id: index + 1,
    name,
    description: null,
    usageType: mergeInventoryUsageTypes(
      items.filter((item) => (item.category || 'General') === name).map((item) => item.usageType ?? 'recipe_only')
    ),
    itemsCount: items.filter((item) => (item.category || 'General') === name).length
  }));
}

function syncInventoryCategoryCounts(items: InventoryItem[], categories: InventoryCategory[]) {
  const counts = categoriesFromInventory(items);
  const categoryByName = new Map(categories.map((category) => [category.name, category]));
  const countByName = new Map(counts.map((category) => [category.name, category]));
  const mergedNames = Array.from(new Set([...categories.map((category) => category.name), ...counts.map((category) => category.name)])).sort();

  return mergedNames.map((name, index) => {
    const saved = categoryByName.get(name);
    const counted = countByName.get(name);
    return {
      id: saved?.id ?? counted?.id ?? index + 1,
      name,
      description: saved?.description ?? counted?.description ?? null,
      usageType: saved?.usageType ?? counted?.usageType ?? 'recipe_only',
      itemsCount: counted?.itemsCount ?? 0
    };
  });
}

function loadLocalInventoryCategories(items: InventoryItem[]) {
  const raw = localStorage.getItem(inventoryCategoriesKey);
  if (!raw) return categoriesFromInventory(items);
  try {
    const parsed = JSON.parse(raw) as InventoryCategory[];
    return parsed.map((category) => ({
      ...category,
      usageType: category.usageType ?? 'recipe_only',
      itemsCount: items.filter((item) => (item.category || 'General') === category.name).length
    }));
  } catch {
    return categoriesFromInventory(items);
  }
}

function menuCategoriesFromMenu(items: MenuItem[]): MenuCategory[] {
  const names = Array.from(new Set(['General', ...items.map((item) => item.category || 'General')])).sort();
  return names.map((name, index) => ({
    id: items.find((item) => item.category === name)?.categoryId ?? index + 1,
    name,
    description: null,
    itemsCount: items.filter((item) => (item.category || 'General') === name).length
  }));
}

function loadLocalMenuCategories(items: MenuItem[]) {
  const raw = localStorage.getItem(menuCategoriesKey);
  if (!raw) return menuCategoriesFromMenu(items);
  try {
    const parsed = JSON.parse(raw) as MenuCategory[];
    return parsed.map((category) => ({
      ...category,
      itemsCount: items.filter((item) => (item.category || 'General') === category.name).length
    }));
  } catch {
    return menuCategoriesFromMenu(items);
  }
}

function persistLocalData(
  inventoryItems: InventoryItem[],
  menuItems: MenuItem[],
  inventoryCategories?: InventoryCategory[],
  menuCategories?: MenuCategory[]
) {
  localStorage.setItem(inventoryKey, JSON.stringify(inventoryItems));
  localStorage.setItem(menuKey, JSON.stringify(menuItems));
  if (inventoryCategories) {
    localStorage.setItem(inventoryCategoriesKey, JSON.stringify(inventoryCategories));
  }
  if (menuCategories) {
    localStorage.setItem(menuCategoriesKey, JSON.stringify(menuCategories));
  }
}

function computeMenuMetrics(
  menuItem: MenuItemInput,
  _inventoryItems: InventoryItem[]
) {
  const estimatedCost = menuItem.estimatedCost;
  const profit = menuItem.sellingPrice - estimatedCost;
  const margin = menuItem.sellingPrice > 0 ? (profit / menuItem.sellingPrice) * 100 : 0;
  return {
    estimatedCost,
    profit,
    margin
  };
}

function hasPermission(...permissions: string[]) {
  return useAuthStore.getState().hasPermission(...permissions);
}

const initialNavigation = resolveNavigationPath(typeof window === 'undefined' ? '/apps' : window.location.pathname);

export const usePosStore = create<PosState>((set, get) => ({
  currentModule: initialNavigation.module,
  posScreen: initialNavigation.posScreen,
  categories: [],
  products: [],
  orders: [],
  kitchenOrders: [],
  dashboard: null,
  profitReport: null,
  expenses: [],
  expenseCategories: [],
  cashSessions: [],
  employeeProfiles: [],
  salaryAdvances: [],
  payrollAdjustments: [],
  payrollPeriods: [],
  stockRows: [],
  stockMovements: [],
  inventoryItems: initialInventoryItems,
  inventoryCategories: categoriesFromInventory(initialInventoryItems),
  menuItems: initialMenuItems,
  menuCategories: menuCategoriesFromMenu(initialMenuItems),
  restaurantTables: [],
  restaurantSettings: null,
  staffUsers: [],
  roles: [],
  permissions: [],
  selectedCategory: 'Tout',
  search: '',
  cart: [],
  orderType: 'dine_in',
  tableNumber: 'A1',
  notes: '',
  deliveryForm: {
    customerName: '',
    phone: '',
    address: '',
    deliveryFee: 0
  },
  loading: true,
  submitting: false,
  lastError: null,
  setCurrentModule: (currentModule) => {
    const posScreen = get().posScreen;
    set({ currentModule });
    writeNavigationPath(currentModule, posScreen);
  },
  setPosScreen: (posScreen) => {
    set({ currentModule: 'pos', posScreen });
    writeNavigationPath('pos', posScreen);
  },
  syncNavigationFromUrl: () => {
    const nextNavigation = resolveNavigationPath(typeof window === 'undefined' ? '/apps' : window.location.pathname);
    set({
      currentModule: nextNavigation.module,
      posScreen: nextNavigation.module === 'pos' ? nextNavigation.posScreen : get().posScreen
    });
    writeNavigationPath(
      nextNavigation.module,
      nextNavigation.module === 'pos' ? nextNavigation.posScreen : get().posScreen,
      'replace'
    );
  },
  setSearch: (value) => set({ search: value }),
  setSelectedCategory: (value) => set({ selectedCategory: value }),
  setOrderType: (value) => set({ orderType: value }),
  setTableNumber: (value) => set({ tableNumber: value }),
  setNotes: (value) => set({ notes: value }),
  setDeliveryForm: (patch) =>
    set((state) => ({
      deliveryForm: { ...state.deliveryForm, ...patch }
    })),
  addToCart: (product) =>
    set((state) => {
      const existing = state.cart.find((item) => item.productId === product.id);
      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        };
      }
      return {
        cart: [
          ...state.cart,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            icon: product.icon,
            color: product.color
          }
        ]
      };
    }),
  increaseItem: (productId) =>
    set((state) => ({
      cart: state.cart.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
      )
    })),
  decreaseItem: (productId) =>
    set((state) => ({
      cart: state.cart
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    })),
  removeItem: (productId) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.productId !== productId)
    })),
  clearCart: () => set({ cart: [], notes: '' }),
  holdCart: () => {
    const state = get();
    if (state.cart.length === 0) {
      set({ lastError: 'Le panier est vide, rien a mettre en attente' });
      return;
    }
    localStorage.setItem(
      heldCartKey,
      JSON.stringify({
        cart: state.cart,
        orderType: state.orderType,
        tableNumber: state.tableNumber,
        notes: state.notes,
        deliveryForm: state.deliveryForm
      })
    );
    set({ cart: [], notes: '', lastError: null });
  },
  restoreHeldCart: () => {
    const raw = localStorage.getItem(heldCartKey);
    if (!raw) {
      set({ lastError: 'Aucune commande en attente' });
      return;
    }
    const held = JSON.parse(raw) as Pick<PosState, 'cart' | 'orderType' | 'tableNumber' | 'notes' | 'deliveryForm'>;
    set({
      cart: held.cart,
      orderType: held.orderType,
      tableNumber: held.tableNumber,
      notes: held.notes,
      deliveryForm: held.deliveryForm,
      lastError: null
    });
  },
  upsertInventoryItem: async (item) => {
    const state = get();
    try {
      const nextItem = item.id
        ? await updateInventoryItem(item.id, item)
        : await createInventoryItem(item);
      const inventoryItems = item.id
        ? state.inventoryItems.map((existing) => (existing.id === item.id ? nextItem : existing))
        : [nextItem, ...state.inventoryItems];
      const inventoryCategories = syncInventoryCategoryCounts(inventoryItems, state.inventoryCategories);
      set({ inventoryItems, inventoryCategories, lastError: null });
      persistLocalData(inventoryItems, state.menuItems, inventoryCategories);
      await get().refreshLiveData();
    } catch {
      const quantity = item.initialQuantity ?? state.inventoryItems.find((existing) => existing.id === item.id)?.quantity ?? 0;
      const minimumStock = item.minimumStock ?? null;
      const nextItem: InventoryItem = {
        name: item.name,
        category: item.category || 'General',
        measurementType: item.measurementType ?? (item.unit === 'kg' ? 'weight' : item.unit === 'liter' ? 'volume' : 'portion'),
        unit: item.unit,
        usageType: item.usageType ?? 'recipe_only',
        estimatedCost: item.estimatedCost ?? 0,
        minimumStock,
        directSale:
          item.directSale?.enabled && item.directSale.sellingPrice > 0
            ? {
                productId: item.id ?? Date.now(),
                sellingPrice: item.directSale.sellingPrice,
                category: item.directSale.category ?? item.category ?? 'General',
                categoryId: item.directSale.categoryId ?? null,
                saleUnitQuantity: item.directSale.saleUnitQuantity ?? 1,
                isActive: true
              }
            : null,
        id: item.id ?? Date.now(),
        quantity,
        status: computeInventoryStatus({ quantity, minimumStock })
      };
      const inventoryItems = item.id
        ? state.inventoryItems.map((existing) => (existing.id === item.id ? nextItem : existing))
        : [nextItem, ...state.inventoryItems];
      const inventoryCategories = syncInventoryCategoryCounts(inventoryItems, state.inventoryCategories);
      set({ inventoryItems, inventoryCategories, lastError: "Mode hors ligne: l'article a ete sauvegarde localement" });
      persistLocalData(inventoryItems, state.menuItems, inventoryCategories);
    }
  },
  addInventoryCategory: async (category) => {
    const state = get();
    try {
      const nextCategory = await createInventoryCategory(category);
      const inventoryCategories = [...state.inventoryCategories, nextCategory].sort((left, right) =>
        left.name.localeCompare(right.name)
      );
      set({ inventoryCategories, lastError: null });
      persistLocalData(state.inventoryItems, state.menuItems, inventoryCategories);
      await get().refreshLiveData();
    } catch {
      const nextCategory: InventoryCategory = {
        id: Date.now(),
        name: category.name.trim(),
        description: category.description ?? null,
        usageType: category.usageType ?? 'recipe_only',
        itemsCount: 0
      };
      const inventoryCategories = [...state.inventoryCategories, nextCategory].sort((left, right) =>
        left.name.localeCompare(right.name)
      );
      set({ inventoryCategories, lastError: 'Mode hors ligne: la categorie a ete sauvegardee localement' });
      persistLocalData(state.inventoryItems, state.menuItems, inventoryCategories);
    }
  },
  removeInventoryCategory: async (id) => {
    const state = get();
    try {
      await deleteInventoryCategory(id);
      const inventoryCategories = state.inventoryCategories.filter((category) => category.id !== id);
      set({ inventoryCategories, lastError: null });
      persistLocalData(state.inventoryItems, state.menuItems, inventoryCategories);
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Suppression categorie impossible' });
    }
  },
  addStockEntry: async (entry) => {
    const state = get();
    try {
      const updatedItem = await createStockEntry(entry);
      const inventoryItems = state.inventoryItems.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      const inventoryCategories = syncInventoryCategoryCounts(inventoryItems, state.inventoryCategories);
      set({ inventoryItems, inventoryCategories, lastError: null });
      persistLocalData(inventoryItems, state.menuItems, inventoryCategories);
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Entree de stock impossible' });
    }
  },
  addStockLoss: async (loss) => {
    const state = get();
    try {
      const updatedItem = await createStockLoss(loss);
      const inventoryItems = state.inventoryItems.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      const inventoryCategories = syncInventoryCategoryCounts(inventoryItems, state.inventoryCategories);
      set({ inventoryItems, inventoryCategories, lastError: null });
      persistLocalData(inventoryItems, state.menuItems, inventoryCategories);
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Declaration de perte impossible' });
    }
  },
  upsertMenuItem: async (item) => {
    const state = get();
    try {
      const nextItem = item.id
        ? await updateMenuItem(item.id, item)
        : await createMenuItem(item);
      const menuItems = item.id
        ? state.menuItems.map((existing) => (existing.id === item.id ? nextItem : existing))
        : [nextItem, ...state.menuItems];
      const menuCategories = menuCategoriesFromMenu(menuItems);
      set({ menuItems, menuCategories, lastError: null });
      persistLocalData(state.inventoryItems, menuItems, state.inventoryCategories, menuCategories);
      await get().refreshLiveData();
    } catch {
      const metrics = computeMenuMetrics(item, state.inventoryItems);
      const category = state.menuCategories.find((entry) => entry.id === item.categoryId);
      const nextItem: MenuItem = {
        id: item.id ?? Date.now(),
        name: item.name,
        category: category?.name ?? item.category ?? 'General',
        categoryId: item.categoryId ?? category?.id ?? null,
        image: item.image ?? null,
        ingredients: item.ingredients,
        sellingPrice: item.sellingPrice,
        sourceType: item.sourceType ?? 'recipe',
        stockItemId: item.stockItemId ?? null,
        saleUnitQuantity: item.saleUnitQuantity ?? 1,
        ...metrics
      };
      const menuItems = item.id
        ? state.menuItems.map((existing) => (existing.id === item.id ? nextItem : existing))
        : [nextItem, ...state.menuItems];
      const menuCategories = menuCategoriesFromMenu(menuItems);
      set({ menuItems, menuCategories, lastError: 'Mode hors ligne: le menu a ete sauvegarde localement' });
      persistLocalData(state.inventoryItems, menuItems, state.inventoryCategories, menuCategories);
    }
  },
  addMenuCategory: async (category) => {
    const state = get();
    try {
      const nextCategory = await createMenuCategory(category);
      const menuCategories = [...state.menuCategories, nextCategory].sort((left, right) =>
        left.name.localeCompare(right.name)
      );
      set({ menuCategories, lastError: null });
      persistLocalData(state.inventoryItems, state.menuItems, state.inventoryCategories, menuCategories);
      await get().refreshLiveData();
    } catch {
      const nextCategory: MenuCategory = {
        id: Date.now(),
        name: category.name.trim(),
        description: category.description ?? null,
        itemsCount: 0
      };
      const menuCategories = [...state.menuCategories, nextCategory].sort((left, right) =>
        left.name.localeCompare(right.name)
      );
      set({ menuCategories, lastError: 'Mode hors ligne: la categorie menu a ete sauvegardee localement' });
      persistLocalData(state.inventoryItems, state.menuItems, state.inventoryCategories, menuCategories);
    }
  },
  removeMenuCategory: async (id) => {
    const state = get();
    try {
      await deleteMenuCategory(id);
      const menuCategories = state.menuCategories.filter((category) => category.id !== id);
      set({ menuCategories, lastError: null });
      persistLocalData(state.inventoryItems, state.menuItems, state.inventoryCategories, menuCategories);
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Suppression categorie menu impossible' });
    }
  },
  removeInventoryItem: async (id) => {
    const state = get();
    try {
      await deleteInventoryItem(id);
      const inventoryItems = state.inventoryItems.filter((item) => item.id !== id);
      const inventoryCategories = syncInventoryCategoryCounts(inventoryItems, state.inventoryCategories);
      set({ inventoryItems, inventoryCategories, lastError: null });
      persistLocalData(inventoryItems, state.menuItems, inventoryCategories);
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Suppression stock impossible' });
    }
  },
  removeMenuItem: async (id) => {
    const state = get();
    try {
      await deleteMenuItem(id);
      const menuItems = state.menuItems.filter((item) => item.id !== id);
      const menuCategories = menuCategoriesFromMenu(menuItems);
      set({ menuItems, menuCategories, lastError: null });
      persistLocalData(state.inventoryItems, menuItems, state.inventoryCategories, menuCategories);
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Suppression menu impossible' });
    }
  },
  upsertExpense: async (expense) => {
    const state = get();
    try {
      const nextExpense = expense.id ? await updateExpense(expense.id, expense) : await createExpense(expense);
      const expenses = expense.id
        ? state.expenses.map((entry) => (entry.id === expense.id ? nextExpense : entry))
        : [nextExpense, ...state.expenses];
      set({ expenses, lastError: null });
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Sauvegarde depense impossible' });
    }
  },
  removeExpense: async (id) => {
    const state = get();
    try {
      await deleteExpense(id);
      set({
        expenses: state.expenses.filter((entry) => entry.id !== id),
        lastError: null
      });
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Suppression depense impossible' });
    }
  },
  addExpenseCategory: async (category) => {
    const state = get();
    try {
      const nextCategory = await createExpenseCategory(category);
      set({
        expenseCategories: [...state.expenseCategories, nextCategory].sort((left, right) => left.name.localeCompare(right.name)),
        lastError: null
      });
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Creation categorie depense impossible' });
    }
  },
  removeExpenseCategory: async (id) => {
    const state = get();
    try {
      await deleteExpenseCategory(id);
      set({
        expenseCategories: state.expenseCategories.filter((entry) => entry.id !== id),
        lastError: null
      });
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Suppression categorie depense impossible' });
    }
  },
  saveCashSession: async (session) => {
    const state = get();
    try {
      const nextSession = await upsertCashSession(session);
      const exists = state.cashSessions.some((entry) => entry.id === nextSession.id);
      const cashSessions = exists
        ? state.cashSessions.map((entry) => (entry.id === nextSession.id ? nextSession : entry))
        : [nextSession, ...state.cashSessions];
      set({
        cashSessions: cashSessions.sort((left, right) => right.businessDate.localeCompare(left.businessDate)),
        lastError: null
      });
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Sauvegarde caisse impossible' });
    }
  },
  removeCashSession: async (id) => {
    const state = get();
    try {
      await deleteCashSession(id);
      set({
        cashSessions: state.cashSessions.filter((entry) => entry.id !== id),
        lastError: null
      });
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Suppression caisse impossible' });
    }
  },
  upsertEmployeePayrollProfile: async (profile) => {
    const state = get();
    try {
      const nextProfile = await upsertEmployeeProfile(profile);
      const existing = state.employeeProfiles.some((entry) => entry.id === nextProfile.id);
      set({
        employeeProfiles: existing
          ? state.employeeProfiles.map((entry) => (entry.id === nextProfile.id ? nextProfile : entry))
          : [...state.employeeProfiles, nextProfile].sort((left, right) => left.fullName.localeCompare(right.fullName)),
        lastError: null
      });
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Sauvegarde profil paie impossible' });
    }
  },
  addSalaryAdvance: async (advance) => {
    const state = get();
    try {
      const nextAdvance = await createSalaryAdvance(advance);
      set({
        salaryAdvances: [nextAdvance, ...state.salaryAdvances],
        lastError: null
      });
      await get().refreshAdminData();
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Creation avance impossible' });
    }
  },
  addPayrollAdjustment: async (adjustment) => {
    const state = get();
    try {
      const nextAdjustment = await createPayrollAdjustment(adjustment);
      set({
        payrollAdjustments: [nextAdjustment, ...state.payrollAdjustments],
        lastError: null
      });
      await get().refreshAdminData();
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Creation retenue impossible' });
    }
  },
  removePayrollAdjustment: async (id) => {
    const state = get();
    try {
      await deletePayrollAdjustment(id);
      set({
        payrollAdjustments: state.payrollAdjustments.filter((entry) => entry.id !== id),
        lastError: null
      });
      await get().refreshAdminData();
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Suppression retenue impossible' });
    }
  },
  addPayrollPeriod: async (period) => {
    const state = get();
    try {
      const nextPeriod = await createPayrollPeriod(period);
      set({
        payrollPeriods: [nextPeriod, ...state.payrollPeriods],
        lastError: null
      });
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Creation periode de paie impossible' });
    }
  },
  savePayrollEntry: async (entryId, entry) => {
    const state = get();
    try {
      const period = await updatePayrollEntry(entryId, entry);
      set({
        payrollPeriods: state.payrollPeriods.map((item) => (item.id === period.id ? period : item)),
        lastError: null
      });
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Mise a jour ligne de paie impossible' });
    }
  },
  addPayrollPayment: async (entryId, payment) => {
    const state = get();
    try {
      const period = await createPayrollPayment(entryId, payment);
      set({
        payrollPeriods: state.payrollPeriods.map((item) => (item.id === period.id ? period : item)),
        lastError: null
      });
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Paiement de paie impossible' });
    }
  },
  savePayrollPeriodStatus: async (periodId, status) => {
    const state = get();
    try {
      const period = await updatePayrollPeriodStatus(periodId, status);
      set({
        payrollPeriods: state.payrollPeriods.map((item) => (item.id === period.id ? period : item)),
        lastError: null
      });
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Mise a jour statut paie impossible' });
    }
  },
  upsertStaffUser: async (user) => {
    const state = get();
    try {
      const nextUser = user.id ? await updateStaffUser(user.id, user) : await createStaffUser(user);
      const staffUsers = user.id
        ? state.staffUsers.map((entry) => (entry.id === user.id ? nextUser : entry))
        : [...state.staffUsers, nextUser].sort((left, right) => left.fullName.localeCompare(right.fullName));
      set({ staffUsers, lastError: null });
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Sauvegarde utilisateur impossible' });
    }
  },
  resetStaffPasswordForUser: async (userId, password) => {
    try {
      await resetStaffPassword(userId, password);
      set({ lastError: null });
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Reinitialisation mot de passe impossible' });
    }
  },
  saveRolePermissions: async (roleId, permissionCodes) => {
    const state = get();
    try {
      const role = await updateRolePermissions(roleId, permissionCodes);
      const roles = state.roles.map((entry) => (entry.id === roleId ? role : entry));
      set({ roles, lastError: null });
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Mise a jour role impossible' });
    }
  },
  upsertRestaurantTable: async (table) => {
    const state = get();
    try {
      const nextTable = table.id ? await updateTable(table.id, table) : await createTable(table);
      const restaurantTables = table.id
        ? state.restaurantTables.map((entry) => (entry.id === table.id ? nextTable : entry))
        : [...state.restaurantTables, nextTable].sort((left, right) => left.name.localeCompare(right.name));
      set({ restaurantTables, lastError: null });
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Sauvegarde table impossible' });
    }
  },
  removeRestaurantTable: async (id) => {
    const state = get();
    try {
      await deleteTable(id);
      set({
        restaurantTables: state.restaurantTables.filter((entry) => entry.id !== id),
        lastError: null
      });
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Suppression table impossible' });
    }
  },
  saveRestaurantSettings: async (settings) => {
    try {
      const restaurantSettings = await updateSettings(settings);
      set({ restaurantSettings, lastError: null });
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Sauvegarde parametres impossible' });
    }
  },
  refreshAdminData: async () => {
    try {
      const calls: Array<Promise<void>> = [];

      if (hasPermission('settings.read')) {
        calls.push(
          fetchSettings().then((restaurantSettings) =>
            set((state) => ({
              restaurantSettings,
              deliveryForm: {
                ...state.deliveryForm,
                deliveryFee: 0
              }
            }))
          )
        );
      }
      if (hasPermission('tables.manage', 'pos.use')) {
        calls.push(fetchTables().then((restaurantTables) => set({ restaurantTables })));
      }
      if (hasPermission('staff.manage')) {
        calls.push(fetchStaffUsers().then((staffUsers) => set({ staffUsers })));
      }
      if (hasPermission('roles.manage')) {
        calls.push(
          Promise.all([fetchRoles(), fetchPermissions()]).then(([roles, permissions]) => set({ roles, permissions }))
        );
      }
      if (hasPermission('finance.read', 'finance.write')) {
        calls.push(
          Promise.all([fetchExpenseCategories(), fetchExpenses(), fetchCashSessions()]).then(([expenseCategories, expenses, cashSessions]) =>
            set({ expenseCategories, expenses, cashSessions })
          )
        );
      }
      if (hasPermission('payroll.read', 'payroll.write')) {
        calls.push(
          Promise.all([fetchEmployeeProfiles(), fetchSalaryAdvances(), fetchPayrollAdjustments(), fetchPayrollPeriods()]).then(
            ([employeeProfiles, salaryAdvances, payrollAdjustments, payrollPeriods]) =>
              set({ employeeProfiles, salaryAdvances, payrollAdjustments, payrollPeriods })
          )
        );
      }

      await Promise.all(calls);
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Chargement administration impossible' });
    }
  },
  hydrate: async () => {
    const inventoryItems = loadLocalInventory();
    const inventoryCategories = loadLocalInventoryCategories(inventoryItems);
    const menuItems = loadLocalMenu();
    const menuCategories = loadLocalMenuCategories(menuItems);
    set({
      loading: true,
      lastError: null,
      categories: [],
      products: [],
      orders: [],
      kitchenOrders: [],
      dashboard: null,
      profitReport: null,
      expenses: [],
      expenseCategories: [],
      cashSessions: [],
      employeeProfiles: [],
      salaryAdvances: [],
      payrollAdjustments: [],
      payrollPeriods: [],
      stockRows: [],
      stockMovements: [],
      restaurantTables: [],
      restaurantSettings: null,
      staffUsers: [],
      roles: [],
      permissions: [],
      inventoryItems,
      inventoryCategories,
      menuItems,
      menuCategories
    });
    try {
      const nextState: Partial<PosState> = {};

      if (hasPermission('pos.use', 'pos.cashier', 'pos.kitchen', 'pos.delivery', 'sales.read')) {
        const catalog = await fetchProducts();
        nextState.categories = ['Tout', ...catalog.categories];
        nextState.products = catalog.products;
      }

      if (hasPermission('sales.read', 'pos.cashier', 'pos.delivery')) {
        nextState.orders = await fetchOrders();
      }

      if (hasPermission('pos.kitchen')) {
        nextState.kitchenOrders = await fetchKitchenOrders();
      }

      if (hasPermission('reports.read')) {
        nextState.dashboard = await fetchDashboard();
        nextState.profitReport = await fetchProfitReport();
      }

      if (hasPermission('inventory.read', 'inventory.write')) {
        const [stockRows, stockMovements, serverInventory, serverCategories] = await Promise.all([
          fetchStock(),
          fetchStockMovements(),
          fetchInventoryItems(),
          fetchInventoryCategories()
        ]);
        nextState.stockRows = stockRows;
        nextState.stockMovements = stockMovements;
        nextState.inventoryItems = serverInventory;
        nextState.inventoryCategories = serverCategories;
        persistLocalData(serverInventory, nextState.menuItems ?? menuItems, serverCategories, nextState.menuCategories ?? menuCategories);
      }

      if (hasPermission('recipes.read', 'recipes.write')) {
        const [serverMenu, serverMenuCategories] = await Promise.all([fetchMenuItems(), fetchMenuCategories()]);
        nextState.menuItems = serverMenu;
        nextState.menuCategories = serverMenuCategories;
        persistLocalData(nextState.inventoryItems ?? inventoryItems, serverMenu, nextState.inventoryCategories ?? inventoryCategories, serverMenuCategories);
      }

      set({
        ...nextState,
        loading: false
      });
      await get().refreshAdminData();
    } catch (error) {
      set({
        loading: false,
        lastError: error instanceof Error ? error.message : 'Impossible de charger les donnees POS'
      });
    }
  },
  refreshLiveData: async () => {
    try {
      const updates: Partial<PosState> = {};
      const tasks: Array<Promise<void>> = [];

      if (hasPermission('sales.read', 'pos.cashier', 'pos.delivery')) {
        tasks.push(fetchOrders().then((orders) => void (updates.orders = orders)));
      }
      if (hasPermission('pos.kitchen')) {
        tasks.push(fetchKitchenOrders().then((kitchenOrders) => void (updates.kitchenOrders = kitchenOrders)));
      }
      if (hasPermission('reports.read')) {
        tasks.push(fetchDashboard().then((dashboard) => void (updates.dashboard = dashboard)));
        tasks.push(fetchProfitReport().then((profitReport) => void (updates.profitReport = profitReport)));
      }
      if (hasPermission('finance.read', 'finance.write')) {
        tasks.push(fetchExpenses().then((expenses) => void (updates.expenses = expenses)));
        tasks.push(fetchExpenseCategories().then((expenseCategories) => void (updates.expenseCategories = expenseCategories)));
        tasks.push(fetchCashSessions().then((cashSessions) => void (updates.cashSessions = cashSessions)));
      }
      if (hasPermission('payroll.read', 'payroll.write')) {
        tasks.push(fetchPayrollPeriods().then((payrollPeriods) => void (updates.payrollPeriods = payrollPeriods)));
        tasks.push(fetchSalaryAdvances().then((salaryAdvances) => void (updates.salaryAdvances = salaryAdvances)));
        tasks.push(fetchPayrollAdjustments().then((payrollAdjustments) => void (updates.payrollAdjustments = payrollAdjustments)));
      }
      if (hasPermission('inventory.read', 'inventory.write')) {
        tasks.push(fetchStock().then((stockRows) => void (updates.stockRows = stockRows)));
        tasks.push(fetchStockMovements().then((stockMovements) => void (updates.stockMovements = stockMovements)));
        tasks.push(fetchInventoryItems().then((inventoryItems) => void (updates.inventoryItems = inventoryItems)));
        tasks.push(fetchInventoryCategories().then((inventoryCategories) => void (updates.inventoryCategories = inventoryCategories)));
      }
      if (hasPermission('recipes.read', 'recipes.write')) {
        tasks.push(fetchMenuItems().then((menuItems) => void (updates.menuItems = menuItems)));
        tasks.push(fetchMenuCategories().then((menuCategories) => void (updates.menuCategories = menuCategories)));
      }

      await Promise.all(tasks);
      set(updates);
      if (updates.inventoryItems || updates.menuItems || updates.inventoryCategories || updates.menuCategories) {
        const current = get();
        persistLocalData(
          updates.inventoryItems ?? current.inventoryItems,
          updates.menuItems ?? current.menuItems,
          updates.inventoryCategories ?? current.inventoryCategories,
          updates.menuCategories ?? current.menuCategories
        );
      }
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Actualisation live impossible' });
    }
  },
  submitOrder: async () => {
    const state = get();
    if (state.cart.length === 0) {
      set({ lastError: 'Ajoutez au moins un produit au panier' });
      return;
    }
    if (state.orderType === 'dine_in' && !state.tableNumber.trim()) {
      set({ lastError: 'Choisissez une table avant de valider la commande' });
      return;
    }
    if (state.orderType === 'delivery') {
      const delivery = state.deliveryForm;
      if (!delivery.customerName.trim() || !delivery.phone.trim() || !delivery.address.trim()) {
        set({ lastError: 'Completez le nom, telephone et adresse pour la livraison' });
        return;
      }
    }

    set({ submitting: true, lastError: null });
    try {
      await createOrder({
        type: state.orderType,
        tableNumber: state.orderType === 'dine_in' ? state.tableNumber : null,
        customerName: state.orderType === 'dine_in' ? null : state.deliveryForm.customerName || null,
        phone: state.orderType === 'dine_in' ? null : state.deliveryForm.phone || null,
        address: state.orderType === 'delivery' ? state.deliveryForm.address : null,
        deliveryFee: 0,
        notes: state.notes || null,
        items: state.cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      });
      localStorage.removeItem(heldCartKey);
      set({ cart: [], notes: '', submitting: false });
      await get().refreshLiveData();
      get().setPosScreen('cashier');
    } catch (error) {
      set({ submitting: false, lastError: error instanceof Error ? error.message : 'Creation commande impossible' });
    }
  },
  setKitchenStatus: async (orderId, status) => {
    try {
      const updatedOrder = await updateOrderStatus(orderId, status);
      set((state) => ({
        orders: state.orders.map((order) => (order.id === orderId ? updatedOrder : order)),
        kitchenOrders: state.kitchenOrders.map((order) => (order.id === orderId ? updatedOrder : order)),
        lastError: null
      }));
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Mise a jour cuisine impossible' });
    }
  },
  cancelOrder: async (orderId) => {
    try {
      await cancelOrderRequest(orderId);
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Annulation commande impossible' });
    }
  },
  payOrder: async (orderId, method) => {
    try {
      const updatedOrder = await createPayment(orderId, method);
      printCustomerInvoice(updatedOrder, get().restaurantSettings);
      set((state) => ({
        orders: state.orders.map((order) => (order.id === orderId ? updatedOrder : order)),
        kitchenOrders: state.kitchenOrders.map((order) => (order.id === orderId ? updatedOrder : order)),
        lastError: null
      }));
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Paiement impossible' });
    }
  },
  setDeliveryOrderStatus: async (orderId, status) => {
    try {
      const updatedOrder = await updateDeliveryStatus(orderId, status);
      set((state) => ({
        orders: state.orders.map((order) => (order.id === orderId ? updatedOrder : order)),
        kitchenOrders: state.kitchenOrders.map((order) => (order.id === orderId ? updatedOrder : order)),
        lastError: null
      }));
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Mise a jour livraison impossible' });
    }
  }
}));
