import { InventoryItem, MenuItem } from '../types/pos';

export const initialInventoryItems: InventoryItem[] = [
  {
    id: 1,
    name: 'Viande hachee',
    category: 'Proteines',
    measurementType: 'weight',
    unit: 'g',
    usageType: 'recipe_only',
    quantity: 8200,
    estimatedCost: 0.16,
    minimumStock: 2000,
    isActive: true,
    status: 'in_stock',
    directSale: null
  },
  {
    id: 2,
    name: 'Pain burger',
    category: 'Boulangerie',
    measurementType: 'portion',
    unit: 'piece',
    usageType: 'recipe_only',
    quantity: 54,
    estimatedCost: 18,
    minimumStock: 20,
    isActive: true,
    status: 'in_stock',
    directSale: null
  },
  {
    id: 3,
    name: 'Fromage',
    category: 'Produits laitiers',
    measurementType: 'portion',
    unit: 'slice',
    usageType: 'recipe_only',
    quantity: 16,
    estimatedCost: 22,
    minimumStock: 18,
    isActive: true,
    status: 'low_stock',
    directSale: null
  },
  {
    id: 4,
    name: 'Salade',
    category: 'Legumes',
    measurementType: 'weight',
    unit: 'g',
    usageType: 'recipe_only',
    quantity: 1100,
    estimatedCost: 0.05,
    minimumStock: 800,
    isActive: true,
    status: 'in_stock',
    directSale: null
  },
  {
    id: 5,
    name: 'Sauce tomate',
    category: 'Sauces',
    measurementType: 'weight',
    unit: 'g',
    usageType: 'recipe_only',
    quantity: 5400,
    estimatedCost: 0.03,
    minimumStock: 1200,
    isActive: true,
    status: 'in_stock',
    directSale: null
  },
  {
    id: 6,
    name: 'Boisson cola',
    category: 'Boissons',
    measurementType: 'portion',
    unit: 'bottle',
    usageType: 'direct_sale',
    quantity: 0,
    estimatedCost: 60,
    minimumStock: 12,
    isActive: true,
    status: 'out_of_stock',
    directSale: {
      productId: 6,
      sellingPrice: 120,
      category: 'Boissons',
      categoryId: null,
      saleUnitQuantity: 1,
      isActive: true
    }
  }
];

export const initialMenuItems: MenuItem[] = [
  {
    id: 1,
    name: 'Cheeseburger',
    category: 'Burgers',
    categoryId: 1,
    image: null,
    ingredients: [
      { inventoryItemId: 1, amountUsed: 150, unit: 'g' },
      { inventoryItemId: 2, amountUsed: 1, unit: 'piece' },
      { inventoryItemId: 3, amountUsed: 1, unit: 'slice' },
      { inventoryItemId: 4, amountUsed: 20, unit: 'g' }
    ],
    estimatedCost: 64,
    sellingPrice: 950,
    profit: 886,
    margin: 93.26,
    sourceType: 'recipe',
    stockItemId: null,
    saleUnitQuantity: 1
  },
  {
    id: 2,
    name: 'Pizza margherita',
    category: 'Pizza',
    categoryId: 2,
    image: null,
    ingredients: [
      { inventoryItemId: 5, amountUsed: 120, unit: 'g' },
      { inventoryItemId: 3, amountUsed: 2, unit: 'slice' }
    ],
    estimatedCost: 80,
    sellingPrice: 1400,
    profit: 1320,
    margin: 94.29,
    sourceType: 'recipe',
    stockItemId: null,
    saleUnitQuantity: 1
  }
];
