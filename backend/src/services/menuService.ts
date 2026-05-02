import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  MeasurementUnit,
  MenuCategorySummary,
  MenuItemSummary,
  Product,
  RecipeIngredientSummary
} from '../types/pos';
import { HttpError } from '../utils/httpError';
import { requireField, toNonNegativeNumber, toPositiveNumber } from '../utils/validation';

type ProductWithRecipes = Prisma.ProductGetPayload<{
  include: {
    categoryRef: true;
    recipes: {
      include: {
        ingredient: true;
      };
    };
  };
}>;

interface MenuPayload {
  name: string;
  category?: string;
  categoryId?: number | null;
  image?: string | null;
  color?: string;
  icon?: string;
  estimatedCost: number;
  sellingPrice: number;
  ingredients: Array<{
    inventoryItemId: number;
    amountUsed: number;
    unit: MeasurementUnit;
  }>;
}

interface MenuCategoryPayload {
  name: string;
  description?: string | null;
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function recipeUnitForIngredientUnit(unit: string): MeasurementUnit {
  if (unit === 'kg' || unit === 'g') return 'g';
  if (unit === 'liter' || unit === 'ml') return 'ml';
  return 'portion';
}

function convertRecipeQuantityToStockUnit(quantity: number, recipeUnit: string, stockUnit: string): number {
  if (recipeUnit === stockUnit) return quantity;
  if (recipeUnit === 'g' && stockUnit === 'kg') return quantity / 1000;
  if (recipeUnit === 'kg' && stockUnit === 'g') return quantity * 1000;
  if (recipeUnit === 'ml' && stockUnit === 'liter') return quantity / 1000;
  if (recipeUnit === 'liter' && stockUnit === 'ml') return quantity * 1000;
  return quantity;
}

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

async function getProductRow(id: number, client: PrismaClientLike = prisma) {
  return client.product.findUnique({
    where: { id },
    include: {
      categoryRef: true,
      recipes: {
        include: {
          ingredient: true
        }
      }
    }
  });
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

async function ensureMenuCategory(payload: MenuPayload, client: PrismaClientLike) {
  if (payload.categoryId) {
    const category = await client.menuCategory.findUnique({ where: { id: Number(payload.categoryId) } });
    if (!category) {
      throw new HttpError(404, 'Menu category not found');
    }
    return category;
  }

  const name = normalizeText(payload.category) || 'General';
  return client.menuCategory.upsert({
    where: { name },
    update: {},
    create: { name }
  });
}

async function mapMenuItem(product: ProductWithRecipes): Promise<MenuItemSummary> {
  const recipeRows = [...product.recipes].sort((left, right) =>
    left.ingredient.name.localeCompare(right.ingredient.name)
  );
  const estimatedCost = toNumber(product.estimatedCost);
  const sellingPrice = toNumber(product.price);
  const profit = sellingPrice - estimatedCost;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  return {
    id: product.id,
    name: product.name,
    category: product.categoryRef?.name ?? product.category,
    categoryId: product.categoryId,
    image: product.imageUrl,
    color: product.color,
    icon: product.icon,
    estimatedCost,
    sellingPrice,
    profit,
    margin,
    sourceType: (product.sourceType === 'direct_stock' ? 'direct_stock' : 'recipe'),
    stockItemId: product.stockItemId,
    saleUnitQuantity: toNumber(product.saleUnitQuantity) || 1,
    ingredients: recipeRows.map<RecipeIngredientSummary>((row) => ({
      inventoryItemId: row.ingredientId,
      inventoryItemName: row.ingredient.name,
      amountUsed: toNumber(row.quantity),
      unit: (row.unit || recipeUnitForIngredientUnit(row.ingredient.unit)) as MeasurementUnit
    }))
  };
}

export async function listMenuItems(): Promise<MenuItemSummary[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    include: {
      categoryRef: true,
      recipes: {
        include: {
          ingredient: true
        }
      }
    }
  });

  return Promise.all(rows.map((row) => mapMenuItem(row)));
}

export async function listProducts(): Promise<{ categories: string[]; products: Product[] }> {
  const menuItems = await listMenuItems();
  const products: Product[] = menuItems.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    categoryId: item.categoryId,
    price: item.sellingPrice,
    color: item.color,
    icon: item.icon,
    image: item.image,
    estimatedCost: item.estimatedCost,
    sourceType: item.sourceType,
    stockItemId: item.stockItemId,
    saleUnitQuantity: item.saleUnitQuantity
  }));

  return {
    categories: [...new Set(products.map((product) => product.category))],
    products
  };
}

export async function listMenuCategories(): Promise<MenuCategorySummary[]> {
  const categories = await prisma.menuCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          products: true
        }
      }
    }
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    itemsCount: category._count.products
  }));
}

export async function createMenuCategory(payload: MenuCategoryPayload): Promise<MenuCategorySummary> {
  requireField(payload, 'name');
  const name = normalizeText(payload.name);
  if (!name) {
    throw new HttpError(400, 'Category name is required');
  }

  const category = await prisma.menuCategory.upsert({
    where: { name },
    update: {
      description: normalizeText(payload.description) || undefined
    },
    create: {
      name,
      description: normalizeText(payload.description) || null
    },
    include: {
      _count: {
        select: {
          products: true
        }
      }
    }
  });

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    itemsCount: category._count.products
  };
}

export async function deleteMenuCategory(id: number): Promise<void> {
  const category = await prisma.menuCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          products: true
        }
      }
    }
  });
  if (!category) {
    throw new HttpError(404, 'Category not found');
  }
  if (category._count.products > 0) {
    throw new HttpError(400, 'Cannot delete a category used by menu items');
  }
  await prisma.menuCategory.delete({ where: { id } });
}

export async function createMenuItem(payload: MenuPayload): Promise<MenuItemSummary> {
  requireField(payload, 'name');
  if (!Array.isArray(payload.ingredients) || payload.ingredients.length === 0) {
    throw new HttpError(400, 'At least one ingredient is required');
  }

  return prisma.$transaction(async (client) => {
    const sellingPrice = toNonNegativeNumber(payload.sellingPrice, 'sellingPrice');
    const estimatedCost = toNonNegativeNumber(payload.estimatedCost, 'estimatedCost');
    const category = await ensureMenuCategory(payload, client);
    const created = await client.product.create({
      data: {
        name: normalizeText(payload.name),
        category: category.name,
        categoryId: category.id,
        price: sellingPrice,
        estimatedCost,
        sourceType: 'recipe',
        stockItemId: null,
        saleUnitQuantity: 1,
        isActive: true,
        color: payload.color ?? '#1f2937',
        icon: payload.icon ?? '🍽️',
        imageUrl: payload.image ?? null
      },
      select: {
        id: true
      }
    });

    await client.recipe.createMany({
      data: payload.ingredients.map((ingredient) => ({
        productId: created.id,
        ingredientId: ingredient.inventoryItemId,
        quantity: toPositiveNumber(ingredient.amountUsed, 'amountUsed'),
        unit: ingredient.unit
      }))
    });

    const product = await getProductRow(created.id, client);
    if (!product) {
      throw new HttpError(500, 'Menu item creation failed');
    }
    return mapMenuItem(product);
  });
}

export async function updateMenuItem(id: number, payload: MenuPayload): Promise<MenuItemSummary> {
  requireField(payload, 'name');
  if (!Array.isArray(payload.ingredients) || payload.ingredients.length === 0) {
    throw new HttpError(400, 'At least one ingredient is required');
  }

  return prisma.$transaction(async (client) => {
    const product = await getProductRow(id, client);
    if (!product) {
      throw new HttpError(404, 'Menu item not found');
    }

    const category = await ensureMenuCategory(payload, client);

    await client.product.update({
      where: { id },
      data: {
        name: normalizeText(payload.name),
        category: category.name,
        categoryId: category.id,
        price: toNonNegativeNumber(payload.sellingPrice, 'sellingPrice'),
        estimatedCost: toNonNegativeNumber(payload.estimatedCost, 'estimatedCost'),
        sourceType: 'recipe',
        stockItemId: null,
        saleUnitQuantity: 1,
        isActive: true,
        color: payload.color ?? product.color,
        icon: payload.icon ?? product.icon,
        imageUrl: payload.image ?? null
      }
    });

    await client.recipe.deleteMany({ where: { productId: id } });

    await client.recipe.createMany({
      data: payload.ingredients.map((ingredient) => ({
        productId: id,
        ingredientId: ingredient.inventoryItemId,
        quantity: toPositiveNumber(ingredient.amountUsed, 'amountUsed'),
        unit: ingredient.unit
      }))
    });

    const updated = await getProductRow(id, client);
    if (!updated) {
      throw new HttpError(500, 'Menu item update failed');
    }
    return mapMenuItem(updated);
  });
}

export async function deleteMenuItem(id: number): Promise<void> {
  await prisma.$transaction(async (client) => {
    const product = await getProductRow(id, client);
    if (!product) {
      throw new HttpError(404, 'Menu item not found');
    }

    const saleItemsCount = await client.saleItem.count({
      where: { productId: id }
    });

    if (saleItemsCount > 0) {
      throw new HttpError(400, 'Cannot delete menu item that has already been sold');
    }

    await client.recipe.deleteMany({ where: { productId: id } });
    await client.product.delete({ where: { id } });
  });
}
