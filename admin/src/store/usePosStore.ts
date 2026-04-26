import { create } from 'zustand';
import {
  createStaffUser,
  createTable,
  createInventoryCategory,
  createInventoryItem,
  createMenuCategory,
  createStockEntry,
  deleteTable,
  deleteInventoryCategory,
  deleteInventoryItem,
  createMenuItem,
  createOrder,
  createPayment,
  deleteMenuCategory,
  fetchDashboard,
  fetchInventoryCategories,
  fetchInventoryItems,
  fetchPermissions,
  fetchMenuCategories,
  fetchKitchenOrders,
  fetchMenuItems,
  fetchOrders,
  fetchProfitReport,
  fetchProducts,
  fetchRoles,
  fetchSettings,
  fetchStock,
  fetchStaffUsers,
  fetchTables,
  resetStaffPassword,
  updateRolePermissions,
  updateSettings,
  updateStaffUser,
  updateTable,
  updateDeliveryStatus,
  updateInventoryItem,
  deleteMenuItem,
  updateMenuItem,
  updateOrderStatus
} from '../lib/api';
import { initialInventoryItems, initialMenuItems } from '../lib/mockData';
import {
  Permission,
  CartItem,
  DashboardData,
  DeliveryForm,
  InventoryCategory,
  InventoryItem,
  InventoryItemInput,
  InventoryStatus,
  MenuCategory,
  MenuItem,
  MenuItemInput,
  ModuleId,
  Order,
  OrderType,
  PosScreen,
  Product,
  ProfitReport,
  RestaurantSettings,
  RestaurantTable,
  RestaurantTableInput,
  Role,
  StockEntryInput,
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
  stockRows: StockRow[];
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
  addInventoryCategory: (category: { name: string; description?: string | null }) => Promise<void>;
  removeInventoryCategory: (id: number) => Promise<void>;
  addStockEntry: (entry: StockEntryInput) => Promise<void>;
  upsertMenuItem: (item: MenuItemInput) => Promise<void>;
  addMenuCategory: (category: { name: string; description?: string | null }) => Promise<void>;
  removeMenuCategory: (id: number) => Promise<void>;
  removeInventoryItem: (id: number) => Promise<void>;
  removeMenuItem: (id: number) => Promise<void>;
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
      categoryId: item.categoryId ?? null
    }));
  } catch {
    return initialMenuItems;
  }
}

function categoriesFromInventory(items: InventoryItem[]): InventoryCategory[] {
  const names = Array.from(new Set(['General', ...items.map((item) => item.category || 'General')])).sort();
  return names.map((name, index) => ({
    id: index + 1,
    name,
    description: null,
    itemsCount: items.filter((item) => (item.category || 'General') === name).length
  }));
}

function loadLocalInventoryCategories(items: InventoryItem[]) {
  const raw = localStorage.getItem(inventoryCategoriesKey);
  if (!raw) return categoriesFromInventory(items);
  try {
    const parsed = JSON.parse(raw) as InventoryCategory[];
    return parsed.map((category) => ({
      ...category,
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

export const usePosStore = create<PosState>((set, get) => ({
  currentModule: 'apps',
  posScreen: 'order',
  categories: [],
  products: [],
  orders: [],
  kitchenOrders: [],
  dashboard: null,
  profitReport: null,
  stockRows: [],
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
    deliveryFee: 2
  },
  loading: true,
  submitting: false,
  lastError: null,
  setCurrentModule: (currentModule) => set({ currentModule }),
  setPosScreen: (posScreen) => set({ posScreen }),
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
  },
  restoreHeldCart: () => {
    const raw = localStorage.getItem(heldCartKey);
    if (!raw) return;
    const held = JSON.parse(raw) as Pick<PosState, 'cart' | 'orderType' | 'tableNumber' | 'notes' | 'deliveryForm'>;
    set({
      cart: held.cart,
      orderType: held.orderType,
      tableNumber: held.tableNumber,
      notes: held.notes,
      deliveryForm: held.deliveryForm
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
      const inventoryCategories = categoriesFromInventory(inventoryItems);
      set({ inventoryItems, inventoryCategories, lastError: null });
      persistLocalData(inventoryItems, state.menuItems, inventoryCategories);
    } catch {
      const quantity = item.initialQuantity ?? state.inventoryItems.find((existing) => existing.id === item.id)?.quantity ?? 0;
      const minimumStock = item.minimumStock ?? null;
      const nextItem: InventoryItem = {
        name: item.name,
        category: item.category || 'General',
        measurementType: item.measurementType ?? (item.unit === 'kg' ? 'weight' : item.unit === 'liter' ? 'volume' : 'portion'),
        unit: item.unit,
        estimatedCost: item.estimatedCost ?? 0,
        minimumStock,
        id: item.id ?? Date.now(),
        quantity,
        status: computeInventoryStatus({ quantity, minimumStock })
      };
      const inventoryItems = item.id
        ? state.inventoryItems.map((existing) => (existing.id === item.id ? nextItem : existing))
        : [nextItem, ...state.inventoryItems];
      const inventoryCategories = categoriesFromInventory(inventoryItems);
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
    } catch {
      const nextCategory: InventoryCategory = {
        id: Date.now(),
        name: category.name.trim(),
        description: category.description ?? null,
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
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Suppression categorie impossible' });
    }
  },
  addStockEntry: async (entry) => {
    const state = get();
    try {
      const updatedItem = await createStockEntry(entry);
      const inventoryItems = state.inventoryItems.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      const inventoryCategories = categoriesFromInventory(inventoryItems);
      set({ inventoryItems, inventoryCategories, lastError: null });
      persistLocalData(inventoryItems, state.menuItems, inventoryCategories);
      await get().refreshLiveData();
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Entree de stock impossible' });
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
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Suppression categorie menu impossible' });
    }
  },
  removeInventoryItem: async (id) => {
    const state = get();
    try {
      await deleteInventoryItem(id);
      const inventoryItems = state.inventoryItems.filter((item) => item.id !== id);
      const inventoryCategories = categoriesFromInventory(inventoryItems);
      set({ inventoryItems, inventoryCategories, lastError: null });
      persistLocalData(inventoryItems, state.menuItems, inventoryCategories);
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
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Suppression menu impossible' });
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
                deliveryFee: restaurantSettings.defaultDeliveryFee
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
      stockRows: [],
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
        const [stockRows, serverInventory, serverCategories] = await Promise.all([
          fetchStock(),
          fetchInventoryItems(),
          fetchInventoryCategories()
        ]);
        nextState.stockRows = stockRows;
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
      get().restoreHeldCart();
    } catch (error) {
      set({
        loading: false,
        lastError: error instanceof Error ? error.message : 'Impossible de charger les donnees POS'
      });
      get().restoreHeldCart();
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
      if (hasPermission('inventory.read', 'inventory.write')) {
        tasks.push(fetchStock().then((stockRows) => void (updates.stockRows = stockRows)));
      }

      await Promise.all(tasks);
      set(updates);
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

    set({ submitting: true, lastError: null });
    try {
      await createOrder({
        type: state.orderType,
        tableNumber: state.orderType === 'dine_in' ? state.tableNumber : null,
        customerName: state.orderType === 'dine_in' ? null : state.deliveryForm.customerName || null,
        phone: state.orderType === 'dine_in' ? null : state.deliveryForm.phone || null,
        address: state.orderType === 'delivery' ? state.deliveryForm.address : null,
        deliveryFee: state.orderType === 'delivery' ? state.deliveryForm.deliveryFee : 0,
        notes: state.notes || null,
        items: state.cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      });
      localStorage.removeItem(heldCartKey);
      set({ cart: [], notes: '', submitting: false });
      await get().refreshLiveData();
      set({ currentModule: 'pos', posScreen: state.orderType === 'delivery' ? 'delivery' : 'cashier' });
    } catch (error) {
      set({ submitting: false, lastError: error instanceof Error ? error.message : 'Creation commande impossible' });
    }
  },
  setKitchenStatus: async (orderId, status) => {
    await updateOrderStatus(orderId, status);
    await get().refreshLiveData();
  },
  payOrder: async (orderId, method) => {
    await createPayment(orderId, method);
    await get().refreshLiveData();
  },
  setDeliveryOrderStatus: async (orderId, status) => {
    await updateDeliveryStatus(orderId, status);
    await get().refreshLiveData();
  }
}));
