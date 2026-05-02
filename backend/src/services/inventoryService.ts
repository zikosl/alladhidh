import { ExpenseSourceType, ExpenseStatus, ExpenseType, FinancePaymentMethod, Prisma, StockMovementReason, StockMovementType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { systemExpenseCategories, upsertLinkedExpense } from './expenseSyncService';
import { InventoryCategorySummary, InventoryItemSummary, InventoryUsageType, MeasurementType, MeasurementUnit, StockMovementSummary } from '../types/pos';
import { HttpError } from '../utils/httpError';
import { requireField, toNonNegativeNumber, toPositiveNumber } from '../utils/validation';

interface InventoryRow {
  id: number;
  name: string;
  category: string;
  measurement_type: MeasurementType;
  unit: MeasurementUnit;
  purchase_price: Prisma.Decimal | number | string;
  minimum_stock: Prisma.Decimal | number | string | null;
  usage_type: InventoryUsageType | string;
  quantity: Prisma.Decimal | number | string;
  direct_product_id: number | null;
  direct_selling_price: Prisma.Decimal | number | string | null;
  direct_sale_category: string | null;
  direct_sale_category_id: number | null;
  direct_sale_unit_quantity: Prisma.Decimal | number | string | null;
  direct_sale_is_active: boolean | null;
}

interface InventoryPayload {
  name: string;
  category?: string;
  measurementType?: MeasurementType;
  unit: MeasurementUnit;
  usageType?: InventoryUsageType;
  estimatedCost?: number;
  initialQuantity?: number;
  initialTotalPrice?: number;
  minimumStock?: number | null;
  directSale?: {
    enabled?: boolean;
    sellingPrice?: number;
    category?: string;
    categoryId?: number | null;
    saleUnitQuantity?: number;
  };
}

interface StockEntryPayload {
  ingredientId: number;
  quantity: number;
  totalPrice: number;
  expenseStatus?: 'planned' | 'partial' | 'paid' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'transfer';
  supplierName?: string | null;
  date?: string | null;
}

interface StockLossPayload {
  ingredientId: number;
  quantity: number;
  date?: string | null;
}

interface CategoryPayload {
  name: string;
  description?: string | null;
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function normalizeUsageType(value: unknown): InventoryUsageType {
  if (value === 'direct_sale' || value === 'both' || value === 'recipe_only') {
    return value;
  }
  return 'recipe_only';
}

function mapInventoryRow(row: InventoryRow): InventoryItemSummary {
  const quantity = toNumber(row.quantity);
  const minimumStock = row.minimum_stock === null ? null : toNumber(row.minimum_stock);
  const measurementType = String(row.measurement_type) === 'unit' ? 'portion' : row.measurement_type;
  const status =
    quantity <= 0 ? 'out_of_stock' : minimumStock !== null && quantity <= minimumStock ? 'low_stock' : 'in_stock';

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    measurementType,
    unit: row.unit,
    usageType: normalizeUsageType(row.usage_type),
    quantity,
    estimatedCost: toNumber(row.purchase_price),
    minimumStock,
    status,
    directSale: row.direct_product_id
      ? {
          productId: row.direct_product_id,
          sellingPrice: toNumber(row.direct_selling_price),
          category: row.direct_sale_category ?? row.category,
          categoryId: row.direct_sale_category_id,
          saleUnitQuantity: toNumber(row.direct_sale_unit_quantity) || 1,
          isActive: Boolean(row.direct_sale_is_active)
        }
      : null
  };
}

function mapStockMovement(row: Prisma.StockMovementGetPayload<{ include: { ingredient: true } }>): StockMovementSummary {
  return {
    id: row.id,
    ingredientId: row.ingredientId,
    ingredientName: row.ingredient.name,
    category: row.ingredient.category,
    type: row.type,
    reason: row.reason,
    quantity: toNumber(row.quantity),
    unit: row.ingredient.unit as MeasurementUnit,
    date: row.date.toISOString(),
    createdAt: row.createdAt.toISOString()
  };
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeUnit(unit: MeasurementUnit | 'litre'): MeasurementUnit {
  if (unit === 'litre') {
    return 'liter';
  }
  return unit;
}

function measurementTypeFromUnit(unit: MeasurementUnit): MeasurementType {
  if (unit === 'kg' || unit === 'g') return 'weight';
  if (unit === 'liter' || unit === 'ml') return 'volume';
  return 'portion';
}

async function ensureCategory(name: string, client: PrismaClientLike = prisma) {
  const categoryName = normalizeText(name) || 'General';
  await client.ingredientCategory.upsert({
    where: { name: categoryName },
    update: {},
    create: { name: categoryName }
  });
  return categoryName;
}

async function ensureMenuCategoryForDirectSale(payload: InventoryPayload, fallbackName: string, client: PrismaClientLike) {
  if (payload.directSale?.categoryId) {
    const category = await client.menuCategory.findUnique({ where: { id: Number(payload.directSale.categoryId) } });
    if (!category) {
      throw new HttpError(404, 'Menu category not found');
    }
    return category;
  }

  const name = normalizeText(payload.directSale?.category) || fallbackName || 'General';
  return client.menuCategory.upsert({
    where: { name },
    update: {},
    create: { name }
  });
}

async function syncDirectSaleProduct(ingredientId: number, payload: InventoryPayload, client: PrismaClientLike) {
  const ingredient = await client.ingredient.findUnique({ where: { id: ingredientId } });
  if (!ingredient) {
    throw new HttpError(404, 'Raw material not found');
  }

  const usageType = normalizeUsageType(payload.usageType);
  const shouldSellDirectly =
    (usageType === 'direct_sale' || usageType === 'both') &&
    payload.directSale?.enabled !== false;

  const existingDirectProduct = await client.product.findFirst({
    where: {
      stockItemId: ingredientId,
      sourceType: 'direct_stock'
    }
  });

  if (!shouldSellDirectly) {
    if (existingDirectProduct) {
      await client.product.update({
        where: { id: existingDirectProduct.id },
        data: { isActive: false }
      });
    }
    return;
  }

  const sellingPrice = toPositiveNumber(payload.directSale?.sellingPrice ?? 0, 'directSale.sellingPrice');
  const saleUnitQuantity = toPositiveNumber(payload.directSale?.saleUnitQuantity ?? 1, 'directSale.saleUnitQuantity');
  const category = await ensureMenuCategoryForDirectSale(payload, ingredient.category, client);
  const estimatedCost = Number(ingredient.purchasePrice) * saleUnitQuantity;
  const productPayload = {
    name: ingredient.name,
    category: category.name,
    categoryId: category.id,
    price: sellingPrice,
    estimatedCost,
    sourceType: 'direct_stock',
    stockItemId: ingredient.id,
    saleUnitQuantity,
    isActive: true,
    color: '#0ea5e9',
    icon: ingredient.unit === 'bottle' ? '💧' : '🧃',
    imageUrl: null
  };

  if (existingDirectProduct) {
    await client.product.update({
      where: { id: existingDirectProduct.id },
      data: productPayload
    });
    return;
  }

  const productWithSameName = await client.product.findUnique({ where: { name: ingredient.name } });
  if (productWithSameName) {
    if (productWithSameName.sourceType !== 'direct_stock' || productWithSameName.stockItemId) {
      throw new HttpError(400, `Un article caisse nommé "${ingredient.name}" existe deja`);
    }

    await client.product.update({
      where: { id: productWithSameName.id },
      data: productPayload
    });
    return;
  }

  await client.product.create({
    data: productPayload
  });
}

async function getInventoryRow(id: number, client: PrismaClientLike = prisma) {
  const rows = await client.$queryRaw<InventoryRow[]>(Prisma.sql`
    SELECT
      i.id,
      i.name,
      i.category,
      i.measurement_type,
      i.unit,
      i.purchase_price,
      i.minimum_stock,
      i.usage_type,
      COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0) AS quantity,
      p.id AS direct_product_id,
      p.price AS direct_selling_price,
      p.category AS direct_sale_category,
      p.category_id AS direct_sale_category_id,
      p.sale_unit_quantity AS direct_sale_unit_quantity,
      p.is_active AS direct_sale_is_active
    FROM ingredients i
    LEFT JOIN stock_movements sm ON sm.ingredient_id = i.id
    LEFT JOIN products p ON p.stock_item_id = i.id AND p.source_type = 'direct_stock'
    WHERE i.id = ${id}
    GROUP BY i.id, p.id
  `);

  return rows[0];
}

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

export async function listInventoryItems(): Promise<InventoryItemSummary[]> {
  const rows = await prisma.$queryRaw<InventoryRow[]>(Prisma.sql`
    SELECT
      i.id,
      i.name,
      i.category,
      i.measurement_type,
      i.unit,
      i.purchase_price,
      i.minimum_stock,
      i.usage_type,
      COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0) AS quantity,
      p.id AS direct_product_id,
      p.price AS direct_selling_price,
      p.category AS direct_sale_category,
      p.category_id AS direct_sale_category_id,
      p.sale_unit_quantity AS direct_sale_unit_quantity,
      p.is_active AS direct_sale_is_active
    FROM ingredients i
    LEFT JOIN stock_movements sm ON sm.ingredient_id = i.id
    LEFT JOIN products p ON p.stock_item_id = i.id AND p.source_type = 'direct_stock'
    GROUP BY i.id, p.id
    ORDER BY i.category, i.name
  `);

  return rows.map(mapInventoryRow);
}

export async function listInventoryCategories(): Promise<InventoryCategorySummary[]> {
  const categories = await prisma.ingredientCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { ingredients: true }
      }
    }
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    itemsCount: category._count.ingredients
  }));
}

export async function listStockMovements(limit = 120): Promise<StockMovementSummary[]> {
  const safeLimit = Math.max(1, Math.min(Number.isFinite(limit) ? Math.trunc(limit) : 120, 250));
  const rows = await prisma.stockMovement.findMany({
    take: safeLimit,
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    include: {
      ingredient: true
    }
  });

  return rows.map(mapStockMovement);
}

export async function createInventoryCategory(payload: CategoryPayload): Promise<InventoryCategorySummary> {
  requireField(payload, 'name');
  const name = normalizeText(payload.name);
  if (!name) {
    throw new HttpError(400, 'Category name is required');
  }

  const category = await prisma.ingredientCategory.upsert({
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
        select: { ingredients: true }
      }
    }
  });

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    itemsCount: category._count.ingredients
  };
}

export async function deleteInventoryCategory(id: number): Promise<void> {
  const category = await prisma.ingredientCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: { ingredients: true }
      }
    }
  });

  if (!category) {
    throw new HttpError(404, 'Category not found');
  }

  if (category._count.ingredients > 0) {
    throw new HttpError(400, 'Cannot delete a category used by raw materials');
  }

  await prisma.ingredientCategory.delete({ where: { id } });
}

export async function createInventoryItem(payload: InventoryPayload): Promise<InventoryItemSummary> {
  requireField(payload, 'name');
  requireField(payload, 'unit');

  return prisma.$transaction(async (client) => {
    const name = normalizeText(payload.name);
    if (!name) {
      throw new HttpError(400, 'Raw material name is required');
    }
    const unit = normalizeUnit(payload.unit as MeasurementUnit | 'litre');
    const measurementType = payload.measurementType ?? measurementTypeFromUnit(unit);
    const usageType = normalizeUsageType(payload.usageType);
    const category = await ensureCategory(payload.category ?? 'General', client);
    const initialQuantity = toNonNegativeNumber(payload.initialQuantity ?? 0, 'initialQuantity');
    const initialTotalPrice = toNonNegativeNumber(payload.initialTotalPrice ?? 0, 'initialTotalPrice');
    const estimatedCost =
      initialQuantity > 0 && initialTotalPrice > 0
        ? initialTotalPrice / initialQuantity
        : toNonNegativeNumber(payload.estimatedCost ?? 0, 'estimatedCost');
    const minimumStock =
      payload.minimumStock === undefined || payload.minimumStock === null
        ? null
        : toNonNegativeNumber(payload.minimumStock, 'minimumStock');

    const created = await client.ingredient.create({
      data: {
        name,
        category,
        measurementType,
        unit,
        usageType,
        purchasePrice: estimatedCost,
        minimumStock
      },
      select: {
        id: true
      }
    });

    if (initialQuantity > 0) {
      const date = new Date();
      const purchase = await client.purchase.create({
        data: {
          ingredientId: created.id,
          quantity: initialQuantity,
          totalPrice: initialTotalPrice,
          date
        }
      });

      await client.stockMovement.create({
        data: {
          ingredientId: created.id,
          type: StockMovementType.IN,
          quantity: initialQuantity,
          reason: StockMovementReason.purchase,
          date
        }
      });

      await upsertLinkedExpense(client, {
        sourceType: ExpenseSourceType.stock_purchase,
        sourceId: purchase.id,
        sourceLabel: name,
        amount: initialTotalPrice,
        category: systemExpenseCategories.stockPurchase,
        type: ExpenseType.variable,
        status: ExpenseStatus.paid,
        paymentMethod: FinancePaymentMethod.cash,
        supplierName: null,
        description: `Stock initial - ${name}`,
        date,
        paidAt: date
      });
    }

    await syncDirectSaleProduct(created.id, payload, client);

    const row = await getInventoryRow(created.id, client);
    if (!row) {
      throw new HttpError(500, 'Inventory item creation failed');
    }
    return mapInventoryRow(row);
  });
}

export async function updateInventoryItem(id: number, payload: InventoryPayload): Promise<InventoryItemSummary> {
  requireField(payload, 'name');
  requireField(payload, 'unit');

  return prisma.$transaction(async (client) => {
    const name = normalizeText(payload.name);
    if (!name) {
      throw new HttpError(400, 'Raw material name is required');
    }
    const unit = normalizeUnit(payload.unit as MeasurementUnit | 'litre');
    const measurementType = payload.measurementType ?? measurementTypeFromUnit(unit);
    const usageType = normalizeUsageType(payload.usageType);
    const category = await ensureCategory(payload.category ?? 'General', client);
    const estimatedCost = toNonNegativeNumber(payload.estimatedCost ?? 0, 'estimatedCost');
    const minimumStock =
      payload.minimumStock === undefined || payload.minimumStock === null
        ? null
        : toNonNegativeNumber(payload.minimumStock, 'minimumStock');

    const existing = await getInventoryRow(id, client);
    if (!existing) {
      throw new HttpError(404, 'Inventory item not found');
    }

    await client.ingredient.update({
      where: { id },
      data: {
        name,
        category,
        measurementType,
        unit,
        usageType,
        purchasePrice: estimatedCost,
        minimumStock
      }
    });

    await syncDirectSaleProduct(id, payload, client);

    const updated = await getInventoryRow(id, client);
    if (!updated) {
      throw new HttpError(500, 'Inventory item update failed');
    }
    return mapInventoryRow(updated);
  });
}

export async function createStockEntry(payload: StockEntryPayload): Promise<InventoryItemSummary> {
  requireField(payload, 'ingredientId');

  return prisma.$transaction(async (client) => {
    const ingredientId = Number(payload.ingredientId);
    const quantity = toNonNegativeNumber(payload.quantity, 'quantity');
    const totalPrice = toNonNegativeNumber(payload.totalPrice, 'totalPrice');

    if (quantity <= 0) {
      throw new HttpError(400, 'Stock entry quantity must be greater than zero');
    }

    const ingredient = await client.ingredient.findUnique({ where: { id: ingredientId } });
    if (!ingredient) {
      throw new HttpError(404, 'Raw material not found');
    }

    const date = payload.date ? new Date(payload.date) : new Date();
    const unitCost = totalPrice > 0 ? totalPrice / quantity : Number(ingredient.purchasePrice);

    const purchase = await client.purchase.create({
      data: {
        ingredientId,
        quantity,
        totalPrice,
        date
      }
    });

    await client.stockMovement.create({
      data: {
        ingredientId,
        type: StockMovementType.IN,
        quantity,
        reason: StockMovementReason.purchase,
        date
      }
    });

    await upsertLinkedExpense(client, {
      sourceType: ExpenseSourceType.stock_purchase,
      sourceId: purchase.id,
      sourceLabel: ingredient.name,
      amount: totalPrice,
      category: systemExpenseCategories.stockPurchase,
      type: ExpenseType.variable,
      status: (payload.expenseStatus ?? 'paid') as ExpenseStatus,
      paymentMethod: (payload.paymentMethod ?? 'cash') as FinancePaymentMethod,
      supplierName: payload.supplierName ? String(payload.supplierName).trim() : null,
      description: `Achat stock - ${ingredient.name} (${quantity} ${ingredient.unit})`,
      date,
      paidAt: payload.expenseStatus === 'planned' || payload.expenseStatus === 'partial' ? null : date
    });

    await client.ingredient.update({
      where: { id: ingredientId },
      data: {
        purchasePrice: unitCost
      }
    });

    const directProducts = await client.product.findMany({
      where: {
        stockItemId: ingredientId,
        sourceType: 'direct_stock'
      },
      select: {
        id: true,
        saleUnitQuantity: true
      }
    });

    for (const product of directProducts) {
      await client.product.update({
        where: { id: product.id },
        data: {
          estimatedCost: unitCost * Number(product.saleUnitQuantity)
        }
      });
    }

    const row = await getInventoryRow(ingredientId, client);
    if (!row) {
      throw new HttpError(500, 'Stock entry failed');
    }

    return mapInventoryRow(row);
  });
}

export async function createStockLoss(payload: StockLossPayload): Promise<InventoryItemSummary> {
  requireField(payload, 'ingredientId');

  return prisma.$transaction(async (client) => {
    const ingredientId = Number(payload.ingredientId);
    const quantity = toNonNegativeNumber(payload.quantity, 'quantity');

    if (quantity <= 0) {
      throw new HttpError(400, 'Stock loss quantity must be greater than zero');
    }

    const ingredient = await client.ingredient.findUnique({ where: { id: ingredientId } });
    if (!ingredient) {
      throw new HttpError(404, 'Raw material not found');
    }

    await client.$queryRaw(Prisma.sql`
      SELECT id
      FROM ingredients
      WHERE id = ${ingredientId}
      FOR UPDATE
    `);

    const rowBeforeLoss = await getInventoryRow(ingredientId, client);
    if (!rowBeforeLoss) {
      throw new HttpError(404, 'Raw material not found');
    }

    const currentStock = toNumber(rowBeforeLoss.quantity);
    if (quantity > currentStock) {
      throw new HttpError(400, `Stock loss exceeds available stock (${currentStock})`);
    }

    await client.stockMovement.create({
      data: {
        ingredientId,
        type: StockMovementType.OUT,
        quantity,
        reason: StockMovementReason.loss,
        date: payload.date ? new Date(payload.date) : new Date()
      }
    });

    const row = await getInventoryRow(ingredientId, client);
    if (!row) {
      throw new HttpError(500, 'Stock loss failed');
    }

    return mapInventoryRow(row);
  });
}

export async function deleteInventoryItem(id: number): Promise<void> {
  await prisma.$transaction(async (client) => {
    const existing = await getInventoryRow(id, client);
    if (!existing) {
      throw new HttpError(404, 'Inventory item not found');
    }

    const recipesCount = await client.recipe.count({
      where: { ingredientId: id }
    });

    const directProductsWithSalesCount = await client.product.count({
      where: {
        stockItemId: id,
        saleItems: {
          some: {}
        }
      }
    });

    if (recipesCount > 0 || directProductsWithSalesCount > 0) {
      throw new HttpError(400, 'Cannot delete inventory item used by recipes or sales');
    }

    await client.product.deleteMany({
      where: {
        stockItemId: id,
        sourceType: 'direct_stock'
      }
    });

    const [movementsCount, purchasesCount] = await Promise.all([
      client.stockMovement.count({ where: { ingredientId: id } }),
      client.purchase.count({ where: { ingredientId: id } })
    ]);

    if (movementsCount > 0 || purchasesCount > 0) {
      throw new HttpError(400, 'Cannot delete inventory item with stock history');
    }

    await client.ingredient.delete({ where: { id } });
  });
}
