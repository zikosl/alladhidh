import { Prisma, StockMovementReason, StockMovementType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { InventoryCategorySummary, InventoryItemSummary, MeasurementType, MeasurementUnit } from '../types/pos';
import { HttpError } from '../utils/httpError';
import { requireField, toNonNegativeNumber } from '../utils/validation';

interface InventoryRow {
  id: number;
  name: string;
  category: string;
  measurement_type: MeasurementType;
  unit: MeasurementUnit;
  purchase_price: Prisma.Decimal | number | string;
  minimum_stock: Prisma.Decimal | number | string | null;
  quantity: Prisma.Decimal | number | string;
}

interface InventoryPayload {
  name: string;
  category?: string;
  measurementType?: MeasurementType;
  unit: MeasurementUnit;
  estimatedCost?: number;
  initialQuantity?: number;
  initialTotalPrice?: number;
  minimumStock?: number | null;
}

interface StockEntryPayload {
  ingredientId: number;
  quantity: number;
  totalPrice: number;
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
    quantity,
    estimatedCost: toNumber(row.purchase_price),
    minimumStock,
    status
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
      COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0) AS quantity
    FROM ingredients i
    LEFT JOIN stock_movements sm ON sm.ingredient_id = i.id
    WHERE i.id = ${id}
    GROUP BY i.id
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
      COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0) AS quantity
    FROM ingredients i
    LEFT JOIN stock_movements sm ON sm.ingredient_id = i.id
    GROUP BY i.id
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
        purchasePrice: estimatedCost,
        minimumStock
      },
      select: {
        id: true
      }
    });

    if (initialQuantity > 0) {
      const date = new Date();
      await client.purchase.create({
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
    }

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
        purchasePrice: estimatedCost,
        minimumStock
      }
    });

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

    await client.purchase.create({
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

    await client.ingredient.update({
      where: { id: ingredientId },
      data: {
        purchasePrice: unitCost
      }
    });

    const row = await getInventoryRow(ingredientId, client);
    if (!row) {
      throw new HttpError(500, 'Stock entry failed');
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

    if (recipesCount > 0) {
      throw new HttpError(400, 'Cannot delete inventory item used by recipes');
    }

    await client.stockMovement.deleteMany({ where: { ingredientId: id } });
    await client.purchase.deleteMany({ where: { ingredientId: id } });
    await client.ingredient.delete({ where: { id } });
  });
}
