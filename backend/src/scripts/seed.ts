import {
  DeliveryStatus,
  PaymentMethod,
  Prisma,
  SaleStatus,
  SaleType,
  StockMovementReason,
  StockMovementType
} from '@prisma/client';
import { prisma } from '../lib/prisma';

const ingredientSeed: Prisma.IngredientCreateManyInput[] = [
  { name: 'Pain burger', category: 'Boulangerie', measurementType: 'portion', unit: 'piece', purchasePrice: 18, minimumStock: 30 },
  { name: 'Steak hache', category: 'Proteines', measurementType: 'portion', unit: 'portion', purchasePrice: 130, minimumStock: 25 },
  { name: 'Fromage cheddar', category: 'Produits laitiers', measurementType: 'portion', unit: 'slice', purchasePrice: 28, minimumStock: 40 },
  { name: 'Laitue', category: 'Legumes', measurementType: 'weight', unit: 'g', purchasePrice: 0.12, minimumStock: 1500 },
  { name: 'Tomate', category: 'Legumes', measurementType: 'weight', unit: 'g', purchasePrice: 0.16, minimumStock: 1500 },
  { name: 'Pommes frites surgelees', category: 'Surgeles', measurementType: 'weight', unit: 'g', purchasePrice: 0.05, minimumStock: 6000 },
  { name: 'Huile de cuisson', category: 'Consommables', measurementType: 'volume', unit: 'ml', purchasePrice: 0.03, minimumStock: 4000 },
  { name: 'Pate a pizza', category: 'Boulangerie', measurementType: 'portion', unit: 'piece', purchasePrice: 85, minimumStock: 20 },
  { name: 'Sauce tomate', category: 'Sauces', measurementType: 'weight', unit: 'g', purchasePrice: 0.07, minimumStock: 2500 },
  { name: 'Mozzarella', category: 'Produits laitiers', measurementType: 'weight', unit: 'g', purchasePrice: 0.11, minimumStock: 3000 },
  { name: 'Blanc de poulet', category: 'Proteines', measurementType: 'weight', unit: 'g', purchasePrice: 0.09, minimumStock: 4000 },
  { name: 'Pates', category: 'Epicerie', measurementType: 'weight', unit: 'g', purchasePrice: 0.03, minimumStock: 4000 },
  { name: 'Sirop cola', category: 'Boissons', measurementType: 'volume', unit: 'ml', purchasePrice: 0.06, minimumStock: 2500 },
  { name: 'Bouteille eau', category: 'Boissons', measurementType: 'portion', unit: 'bottle', purchasePrice: 22, minimumStock: 40 }
];

const ingredientCategorySeed: Prisma.IngredientCategoryCreateManyInput[] = Array.from(
  new Set(['General', ...ingredientSeed.map((ingredient) => ingredient.category ?? 'General')])
).map((name) => ({ name }));

const productSeed: Prisma.ProductCreateManyInput[] = [
  { name: 'Burger classique', category: 'Burgers', price: 650, estimatedCost: 153, color: '#dc2626', icon: '🍔', imageUrl: null },
  { name: 'Cheeseburger', category: 'Burgers', price: 780, estimatedCost: 181, color: '#ef4444', icon: '🧀', imageUrl: null },
  { name: 'Box frites', category: 'Accompagnements', price: 280, estimatedCost: 14, color: '#eab308', icon: '🍟', imageUrl: null },
  { name: 'Pizza margherita', category: 'Pizza', price: 1100, estimatedCost: 104, color: '#f97316', icon: '🍕', imageUrl: null },
  { name: 'Pates au poulet', category: 'Pates', price: 980, estimatedCost: 26, color: '#f59e0b', icon: '🍝', imageUrl: null },
  { name: 'Cola', category: 'Boissons', price: 180, estimatedCost: 3, color: '#2563eb', icon: '🥤', imageUrl: null },
  { name: 'Eau minerale', category: 'Boissons', price: 90, estimatedCost: 22, color: '#0ea5e9', icon: '💧', imageUrl: null }
];

const menuCategorySeed: Prisma.MenuCategoryCreateManyInput[] = Array.from(
  new Set(['General', ...productSeed.map((product) => product.category ?? 'General')])
).map((name) => ({ name }));

const recipeSeed: Array<{ productName: string; ingredientName: string; quantity: number }> = [
  { productName: 'Burger classique', ingredientName: 'Pain burger', quantity: 1 },
  { productName: 'Burger classique', ingredientName: 'Steak hache', quantity: 1 },
  { productName: 'Burger classique', ingredientName: 'Laitue', quantity: 25 },
  { productName: 'Burger classique', ingredientName: 'Tomate', quantity: 30 },
  { productName: 'Cheeseburger', ingredientName: 'Pain burger', quantity: 1 },
  { productName: 'Cheeseburger', ingredientName: 'Steak hache', quantity: 1 },
  { productName: 'Cheeseburger', ingredientName: 'Fromage cheddar', quantity: 1 },
  { productName: 'Cheeseburger', ingredientName: 'Laitue', quantity: 25 },
  { productName: 'Cheeseburger', ingredientName: 'Tomate', quantity: 30 },
  { productName: 'Box frites', ingredientName: 'Pommes frites surgelees', quantity: 250 },
  { productName: 'Box frites', ingredientName: 'Huile de cuisson', quantity: 35 },
  { productName: 'Pizza margherita', ingredientName: 'Pate a pizza', quantity: 1 },
  { productName: 'Pizza margherita', ingredientName: 'Sauce tomate', quantity: 90 },
  { productName: 'Pizza margherita', ingredientName: 'Mozzarella', quantity: 120 },
  { productName: 'Pates au poulet', ingredientName: 'Blanc de poulet', quantity: 180 },
  { productName: 'Pates au poulet', ingredientName: 'Pates', quantity: 150 },
  { productName: 'Pates au poulet', ingredientName: 'Sauce tomate', quantity: 60 },
  { productName: 'Cola', ingredientName: 'Sirop cola', quantity: 50 },
  { productName: 'Eau minerale', ingredientName: 'Bouteille eau', quantity: 1 }
];

function recipeUnitForIngredientUnit(unit: string) {
  if (unit === 'kg' || unit === 'g') return 'g';
  if (unit === 'liter' || unit === 'ml') return 'ml';
  return 'portion';
}

const purchaseSeed: Array<{ ingredientName: string; quantity: number; totalPrice: number }> = [
  { ingredientName: 'Pain burger', quantity: 180, totalPrice: 3240 },
  { ingredientName: 'Steak hache', quantity: 140, totalPrice: 18200 },
  { ingredientName: 'Fromage cheddar', quantity: 120, totalPrice: 3360 },
  { ingredientName: 'Laitue', quantity: 9000, totalPrice: 1080 },
  { ingredientName: 'Tomate', quantity: 9000, totalPrice: 1440 },
  { ingredientName: 'Pommes frites surgelees', quantity: 30000, totalPrice: 1500 },
  { ingredientName: 'Huile de cuisson', quantity: 18000, totalPrice: 540 },
  { ingredientName: 'Pate a pizza', quantity: 70, totalPrice: 5950 },
  { ingredientName: 'Sauce tomate', quantity: 22000, totalPrice: 1540 },
  { ingredientName: 'Mozzarella', quantity: 18000, totalPrice: 1980 },
  { ingredientName: 'Blanc de poulet', quantity: 20000, totalPrice: 1800 },
  { ingredientName: 'Pates', quantity: 15000, totalPrice: 450 },
  { ingredientName: 'Sirop cola', quantity: 12000, totalPrice: 720 },
  { ingredientName: 'Bouteille eau', quantity: 220, totalPrice: 4840 }
];

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function main() {
  const [ingredientCount, productCount, saleCount] = await Promise.all([
    prisma.ingredient.count(),
    prisma.product.count(),
    prisma.sale.count()
  ]);

  if (ingredientCount > 0 || productCount > 0 || saleCount > 0) {
    console.log('Seed skipped: database already contains restaurant data.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.menuCategory.createMany({ data: menuCategorySeed, skipDuplicates: true });
    await tx.ingredientCategory.createMany({ data: ingredientCategorySeed, skipDuplicates: true });
    await tx.ingredient.createMany({ data: ingredientSeed });

    const menuCategories = await tx.menuCategory.findMany({ select: { id: true, name: true } });
    const menuCategoryByName = new Map(menuCategories.map((item) => [item.name, item.id]));

    await tx.product.createMany({
      data: productSeed.map((product) => ({
        ...product,
        categoryId: menuCategoryByName.get(product.category ?? 'General') ?? null
      }))
    });

    const ingredients = await tx.ingredient.findMany({ select: { id: true, name: true } });
    const ingredientUnitByName = new Map(ingredients.map((item) => [item.name, ingredientSeed.find((seed) => seed.name === item.name)?.unit ?? 'portion']));
    const products = await tx.product.findMany({ select: { id: true, name: true, price: true } });
    const ingredientByName = new Map(ingredients.map((item) => [item.name, item.id]));
    const productByName = new Map(products.map((item) => [item.name, item.id]));
    const productPriceByName = new Map(products.map((item) => [item.name, Number(item.price)]));

    await tx.recipe.createMany({
      data: recipeSeed.map((item) => ({
        productId: productByName.get(item.productName)!,
        ingredientId: ingredientByName.get(item.ingredientName)!,
        quantity: item.quantity,
        unit: recipeUnitForIngredientUnit(String(ingredientUnitByName.get(item.ingredientName) ?? 'portion'))
      }))
    });

    const purchases = await Promise.all(
      purchaseSeed.map((item) =>
        tx.purchase.create({
          data: {
            ingredientId: ingredientByName.get(item.ingredientName)!,
            quantity: item.quantity,
            totalPrice: item.totalPrice
          },
          select: {
            ingredientId: true,
            quantity: true,
            date: true
          }
        })
      )
    );

    await tx.stockMovement.createMany({
      data: purchases.map((purchase) => ({
        ingredientId: purchase.ingredientId,
        type: StockMovementType.IN,
        quantity: purchase.quantity,
        reason: StockMovementReason.purchase,
        date: purchase.date
      }))
    });

    await tx.expense.createMany({
      data: [
        { amount: 8500, category: 'loyer', description: 'Quote-part journaliere du local' },
        { amount: 2400, category: 'services', description: 'Electricite, eau et internet' },
        { amount: 3200, category: 'personnel', description: 'Prime d equipe et caisse' }
      ]
    });

    const orderTemplates = [
      {
        type: SaleType.dine_in,
        status: SaleStatus.pending,
        tableNumber: 'A4',
        customerName: null,
        phone: null,
        address: null,
        notes: 'Sans oignon',
        deliveryFee: 0,
        deliveryStatus: null,
        createdAt: minutesAgo(12),
        items: [
          { productName: 'Burger classique', quantity: 1 },
          { productName: 'Box frites', quantity: 1 },
          { productName: 'Cola', quantity: 1 }
        ]
      },
      {
        type: SaleType.delivery,
        status: SaleStatus.preparing,
        tableNumber: null,
        customerName: 'Mina Hassan',
        phone: '+2135550001',
        address: '12 Rue du Marche, Alger',
        notes: 'Sauce en plus',
        deliveryFee: 150,
        deliveryStatus: DeliveryStatus.pending,
        createdAt: minutesAgo(18),
        items: [
          { productName: 'Pizza margherita', quantity: 1 },
          { productName: 'Cola', quantity: 1 }
        ]
      },
      {
        type: SaleType.take_away,
        status: SaleStatus.ready,
        tableNumber: null,
        customerName: 'Client comptoir',
        phone: null,
        address: null,
        notes: null,
        deliveryFee: 0,
        deliveryStatus: null,
        createdAt: minutesAgo(7),
        items: [
          { productName: 'Pates au poulet', quantity: 1 },
          { productName: 'Eau minerale', quantity: 1 }
        ]
      },
      {
        type: SaleType.delivery,
        status: SaleStatus.paid,
        tableNumber: null,
        customerName: 'Samir B.',
        phone: '+2135550042',
        address: 'Cite 180 logements, Blida',
        notes: 'Livraison rapide',
        deliveryFee: 200,
        deliveryStatus: DeliveryStatus.delivered,
        createdAt: minutesAgo(42),
        items: [
          { productName: 'Cheeseburger', quantity: 2 },
          { productName: 'Box frites', quantity: 1 }
        ],
        paymentMethod: PaymentMethod.cash
      }
    ] as const;

    for (const order of orderTemplates) {
      const subtotal = order.items.reduce(
        (sum, item) => sum + productPriceByName.get(item.productName)! * item.quantity,
        0
      );

      const createdSale = await tx.sale.create({
        data: {
          type: order.type,
          status: order.status,
          tableNumber: order.tableNumber,
          customerName: order.customerName,
          phone: order.phone,
          address: order.address,
          notes: order.notes,
          deliveryFee: order.deliveryFee,
          deliveryStatus: order.deliveryStatus,
          totalPrice: subtotal + order.deliveryFee,
          createdAt: order.createdAt,
          updatedAt: order.createdAt
        },
        select: {
          id: true,
          totalPrice: true
        }
      });

      await tx.saleItem.createMany({
        data: order.items.map((item) => ({
          saleId: createdSale.id,
          productId: productByName.get(item.productName)!,
          quantity: item.quantity,
          unitPrice: productPriceByName.get(item.productName)!
        }))
      });

      const recipes = await tx.recipe.findMany({
        where: {
          productId: {
            in: order.items.map((item) => productByName.get(item.productName)!)
          }
        },
        select: {
          productId: true,
          ingredientId: true,
          quantity: true
        }
      });

      const orderItemsByProductId = new Map(
        order.items.map((item) => [productByName.get(item.productName)!, item.quantity])
      );

      await tx.stockMovement.createMany({
        data: recipes.map((recipe) => ({
          ingredientId: recipe.ingredientId,
          type: StockMovementType.OUT,
          quantity: Number(recipe.quantity) * (orderItemsByProductId.get(recipe.productId) ?? 0),
          reason: StockMovementReason.sale,
          date: order.createdAt
        }))
      });

      if (order.status === SaleStatus.paid && 'paymentMethod' in order) {
        await tx.payment.create({
          data: {
            saleId: createdSale.id,
            method: order.paymentMethod,
            amount: createdSale.totalPrice
          }
        });
      }
    }
  });

  console.log('Prisma seed completed with restaurant demo data.');
}

main()
  .catch((error) => {
    console.error('Prisma seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
