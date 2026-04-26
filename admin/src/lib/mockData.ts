import { InventoryItem, MenuItem } from '../types/pos';

export const initialInventoryItems: InventoryItem[] = [
  {
    id: 1,
    name: 'Viande hachee',
    category: 'Proteines',
    measurementType: 'weight',
    unit: 'g',
    quantity: 8200,
    estimatedCost: 0.16,
    minimumStock: 2000,
    status: 'in_stock'
  },
  {
    id: 2,
    name: 'Pain burger',
    category: 'Boulangerie',
    measurementType: 'portion',
    unit: 'piece',
    quantity: 54,
    estimatedCost: 18,
    minimumStock: 20,
    status: 'in_stock'
  },
  {
    id: 3,
    name: 'Fromage',
    category: 'Produits laitiers',
    measurementType: 'portion',
    unit: 'slice',
    quantity: 16,
    estimatedCost: 22,
    minimumStock: 18,
    status: 'low_stock'
  },
  {
    id: 4,
    name: 'Salade',
    category: 'Legumes',
    measurementType: 'weight',
    unit: 'g',
    quantity: 1100,
    estimatedCost: 0.05,
    minimumStock: 800,
    status: 'in_stock'
  },
  {
    id: 5,
    name: 'Sauce tomate',
    category: 'Sauces',
    measurementType: 'weight',
    unit: 'g',
    quantity: 5400,
    estimatedCost: 0.03,
    minimumStock: 1200,
    status: 'in_stock'
  },
  {
    id: 6,
    name: 'Boisson cola',
    category: 'Boissons',
    measurementType: 'portion',
    unit: 'bottle',
    quantity: 0,
    estimatedCost: 60,
    minimumStock: 12,
    status: 'out_of_stock'
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
    margin: 93.26
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
    margin: 94.29
  }
];
