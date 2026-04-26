import {
  DeliveryStatus as PrismaDeliveryStatus,
  PaymentMethod as PrismaPaymentMethod,
  Prisma,
  PrismaClient,
  SaleStatus as PrismaSaleStatus,
  SaleType as PrismaSaleType,
  StockMovementReason,
  StockMovementType
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { DeliveryStatus, OrderStatus, OrderSummary, OrderType, PaymentMethod, CreateOrderInput } from '../types/pos';
import { HttpError } from '../utils/httpError';
import { requireField, toNonNegativeNumber, toPositiveNumber } from '../utils/validation';

type SaleWithItems = Prisma.SaleGetPayload<{
  include: {
    saleItems: {
      include: {
        product: true;
      };
    };
  };
}>;

type ProductWithRecipes = Prisma.ProductGetPayload<{
  include: {
    recipes: {
      include: {
        ingredient: true;
      };
    };
  };
}>;

const orderTypes: OrderType[] = ['dine_in', 'take_away', 'delivery'];
const orderStatuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'paid', 'cancelled'];
const deliveryStatuses: DeliveryStatus[] = ['pending', 'on_the_way', 'delivered'];
const paymentMethods: PaymentMethod[] = ['cash', 'card'];

function toNumber(value: Prisma.Decimal | string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function convertRecipeQuantityToStockUnit(quantity: number, recipeUnit: string, stockUnit: string): number {
  if (recipeUnit === stockUnit) return quantity;
  if (recipeUnit === 'g' && stockUnit === 'kg') return quantity / 1000;
  if (recipeUnit === 'kg' && stockUnit === 'g') return quantity * 1000;
  if (recipeUnit === 'ml' && stockUnit === 'liter') return quantity / 1000;
  if (recipeUnit === 'liter' && stockUnit === 'ml') return quantity * 1000;
  return quantity;
}

function validateOrderType(type: string): asserts type is OrderType {
  if (!orderTypes.includes(type as OrderType)) {
    throw new HttpError(400, `Unsupported order type: ${type}`);
  }
}

function validateOrderStatus(status: string): asserts status is OrderStatus {
  if (!orderStatuses.includes(status as OrderStatus)) {
    throw new HttpError(400, `Unsupported order status: ${status}`);
  }
}

function validateDeliveryStatus(status: string): asserts status is DeliveryStatus {
  if (!deliveryStatuses.includes(status as DeliveryStatus)) {
    throw new HttpError(400, `Unsupported delivery status: ${status}`);
  }
}

function validatePaymentMethod(method: string): asserts method is PaymentMethod {
  if (!paymentMethods.includes(method as PaymentMethod)) {
    throw new HttpError(400, `Unsupported payment method: ${method}`);
  }
}

function mapOrder(order: SaleWithItems): OrderSummary {
  const items = [...order.saleItems].sort((left, right) => left.id - right.id);

  return {
    id: order.id,
    type: order.type as OrderType,
    status: order.status as OrderStatus,
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    phone: order.phone,
    address: order.address,
    notes: order.notes,
    deliveryFee: toNumber(order.deliveryFee),
    deliveryStatus: order.deliveryStatus as DeliveryStatus | null,
    totalPrice: toNumber(order.totalPrice),
    createdAt: order.createdAt.toISOString(),
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice)
    }))
  };
}

async function getOrderOrThrow(client: PrismaClient | Prisma.TransactionClient, orderId: number) {
  const order = await client.sale.findUnique({
    where: { id: orderId },
    include: {
      saleItems: {
        include: {
          product: true
        }
      }
    }
  });

  if (!order) {
    throw new HttpError(404, 'Order not found');
  }

  return order;
}

export async function listOrders(): Promise<OrderSummary[]> {
  const rows = await prisma.sale.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      saleItems: {
        include: {
          product: true
        }
      }
    }
  });

  return rows.map(mapOrder);
}

export async function getKitchenOrders(): Promise<OrderSummary[]> {
  const rows = await prisma.sale.findMany({
    where: {
      status: {
        in: [PrismaSaleStatus.pending, PrismaSaleStatus.preparing, PrismaSaleStatus.ready]
      }
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: {
      saleItems: {
        include: {
          product: true
        }
      }
    }
  });

  return rows.map(mapOrder);
}

export async function createOrder(input: CreateOrderInput): Promise<OrderSummary> {
  requireField(input, 'type');
  validateOrderType(input.type);

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new HttpError(400, 'At least one item is required');
  }

  if (input.type === 'dine_in' && !input.tableNumber) {
    throw new HttpError(400, 'Table number is required for dine-in orders');
  }

  if (input.type === 'delivery' && (!input.customerName || !input.phone || !input.address)) {
    throw new HttpError(400, 'Customer name, phone, and address are required for delivery');
  }

  const initialStatus = input.status ?? 'pending';
  validateOrderStatus(initialStatus);

  if (input.type === 'delivery' && input.deliveryStatus) {
    validateDeliveryStatus(input.deliveryStatus);
  }

  return prisma.$transaction(
    async (client) => {
      const productIds = [...new Set(input.items.map((item) => Number(item.productId)))];
      const products = await client.product.findMany({
        where: {
          id: {
            in: productIds
          }
        },
        include: {
          recipes: {
            include: {
              ingredient: true
            }
          }
        }
      });

      const productsById = new Map<number, ProductWithRecipes>(products.map((product) => [product.id, product]));
      const ingredientUsage = new Map<number, { requiredQuantity: number; ingredientName: string }>();
      const normalizedItems: Array<{ productId: number; quantity: number; unitPrice: number; recipes: ProductWithRecipes['recipes'] }> = [];
      let subtotal = 0;

      for (const item of input.items) {
        const quantity = toPositiveNumber(item.quantity, 'quantity');
        const productId = Number(item.productId);
        const product = productsById.get(productId);

        if (!product) {
          throw new HttpError(404, `Product not found: ${productId}`);
        }

        if (product.recipes.length === 0) {
          throw new HttpError(400, `Product "${product.name}" does not have a recipe`);
        }

        const unitPrice = toNumber(product.price);
        subtotal += unitPrice * quantity;
        normalizedItems.push({
          productId,
          quantity,
          unitPrice,
          recipes: product.recipes
        });

        for (const recipe of product.recipes) {
          const required =
            convertRecipeQuantityToStockUnit(toNumber(recipe.quantity), recipe.unit, recipe.ingredient.unit) * quantity;
          const existing = ingredientUsage.get(recipe.ingredientId);

          ingredientUsage.set(recipe.ingredientId, {
            requiredQuantity: (existing?.requiredQuantity ?? 0) + required,
            ingredientName: recipe.ingredient.name
          });
        }
      }

      const ingredientIds = [...ingredientUsage.keys()];
      if (ingredientIds.length > 0) {
        await client.$queryRaw(Prisma.sql`
          SELECT id
          FROM ingredients
          WHERE id IN (${Prisma.join(ingredientIds)})
          FOR UPDATE
        `);

        const stockRows = await client.$queryRaw<Array<{ ingredient_id: number; current_stock: Prisma.Decimal | number | string }>>(
          Prisma.sql`
            SELECT
              i.id AS ingredient_id,
              COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0) AS current_stock
            FROM ingredients i
            LEFT JOIN stock_movements sm ON sm.ingredient_id = i.id
            WHERE i.id IN (${Prisma.join(ingredientIds)})
            GROUP BY i.id
          `
        );

        const stockByIngredientId = new Map(stockRows.map((row) => [row.ingredient_id, toNumber(row.current_stock)]));
        for (const [ingredientId, usage] of ingredientUsage.entries()) {
          if ((stockByIngredientId.get(ingredientId) ?? 0) < usage.requiredQuantity) {
            throw new HttpError(400, `Insufficient stock for ingredient "${usage.ingredientName}"`);
          }
        }
      }

      const deliveryFee = input.type === 'delivery' ? toNonNegativeNumber(input.deliveryFee ?? 0, 'deliveryFee') : 0;
      const createdSale = await client.sale.create({
        data: {
          type: input.type as PrismaSaleType,
          status: initialStatus as PrismaSaleStatus,
          tableNumber: input.tableNumber ?? null,
          customerName: input.customerName ?? null,
          phone: input.phone ?? null,
          address: input.address ?? null,
          notes: input.notes ?? null,
          deliveryFee,
          deliveryStatus: input.type === 'delivery' ? ((input.deliveryStatus ?? 'pending') as PrismaDeliveryStatus) : null,
          totalPrice: subtotal + deliveryFee
        }
      });

      await client.saleItem.createMany({
        data: normalizedItems.map((item) => ({
          saleId: createdSale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      });

      await client.stockMovement.createMany({
        data: normalizedItems.flatMap((item) =>
          item.recipes.map((recipe) => ({
            ingredientId: recipe.ingredientId,
            type: StockMovementType.OUT,
            quantity:
              convertRecipeQuantityToStockUnit(toNumber(recipe.quantity), recipe.unit, recipe.ingredient.unit) *
              item.quantity,
            reason: StockMovementReason.sale
          }))
        )
      });

      const createdOrder = await getOrderOrThrow(client, createdSale.id);
      return mapOrder(createdOrder);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  );
}

export async function updateOrderStatus(orderId: number, status: string): Promise<OrderSummary> {
  validateOrderStatus(status);

  return prisma.$transaction(async (client) => {
    await getOrderOrThrow(client, orderId);

    const updated = await client.sale.update({
      where: { id: orderId },
      data: {
        status: status as PrismaSaleStatus
      },
      include: {
        saleItems: {
          include: {
            product: true
          }
        }
      }
    });

    return mapOrder(updated);
  });
}

export async function updateDeliveryStatus(orderId: number, deliveryStatus: string): Promise<OrderSummary> {
  validateDeliveryStatus(deliveryStatus);

  return prisma.$transaction(async (client) => {
    const existing = await getOrderOrThrow(client, orderId);

    if (existing.type !== PrismaSaleType.delivery) {
      throw new HttpError(400, 'Delivery status can only be updated for delivery orders');
    }

    const updated = await client.sale.update({
      where: { id: orderId },
      data: {
        deliveryStatus: deliveryStatus as PrismaDeliveryStatus
      },
      include: {
        saleItems: {
          include: {
            product: true
          }
        }
      }
    });

    return mapOrder(updated);
  });
}

export async function createPayment(orderId: number, method: string): Promise<OrderSummary> {
  validatePaymentMethod(method);

  return prisma.$transaction(async (client) => {
    const existing = await getOrderOrThrow(client, orderId);

    await client.payment.create({
      data: {
        saleId: orderId,
        method: method as PrismaPaymentMethod,
        amount: existing.totalPrice
      }
    });

    const updated = await client.sale.update({
      where: { id: orderId },
      data: {
        status: PrismaSaleStatus.paid
      },
      include: {
        saleItems: {
          include: {
            product: true
          }
        }
      }
    });

    return mapOrder(updated);
  });
}
