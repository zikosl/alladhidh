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

const stockCategoryUsage = new Map<string, 'recipe_only' | 'direct_sale' | 'both'>([
  ['Boissons', 'both']
]);

function usageTypeForStockCategory(category: string) {
  return stockCategoryUsage.get(category) ?? 'recipe_only';
}

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
].map((ingredient) => ({
  ...ingredient,
  usageType: usageTypeForStockCategory(ingredient.category ?? 'General')
}));

const ingredientCategorySeed: Prisma.IngredientCategoryCreateManyInput[] = Array.from(
  new Set(['General', ...ingredientSeed.map((ingredient) => ingredient.category ?? 'General')])
).map((name) => ({ name, usageType: usageTypeForStockCategory(name) }));

const productSeed: Array<Prisma.ProductCreateManyInput & { stockItemName?: string }> = [
  { name: 'Burger classique', category: 'Burgers', price: 650, estimatedCost: 153, color: '#dc2626', icon: '🍔', imageUrl: null },
  { name: 'Cheeseburger', category: 'Burgers', price: 780, estimatedCost: 181, color: '#ef4444', icon: '🧀', imageUrl: null },
  { name: 'Box frites', category: 'Accompagnements', price: 280, estimatedCost: 14, color: '#eab308', icon: '🍟', imageUrl: null },
  { name: 'Pizza margherita', category: 'Pizza', price: 1100, estimatedCost: 104, color: '#f97316', icon: '🍕', imageUrl: null },
  { name: 'Pates au poulet', category: 'Pates', price: 980, estimatedCost: 26, color: '#f59e0b', icon: '🍝', imageUrl: null },
  { name: 'Cola', category: 'Boissons', price: 180, estimatedCost: 3, color: '#2563eb', icon: '🥤', imageUrl: null },
  { name: 'Eau minerale', category: 'Boissons', price: 90, estimatedCost: 22, color: '#0ea5e9', icon: '💧', imageUrl: null, sourceType: 'direct_stock', saleUnitQuantity: 1, stockItemName: 'Bouteille eau' }
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
  { productName: 'Cola', ingredientName: 'Sirop cola', quantity: 50 }
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
    await tx.expenseCategory.createMany({
      data: [
        { name: 'Loyer', description: 'Charges fixes du local', isSystem: true },
        { name: 'Services', description: 'Electricite, eau, internet', isSystem: true },
        { name: 'Personnel', description: 'Salaires, primes et paie', isSystem: true },
        { name: 'Achats', description: 'Achats non stockes et consommables', isSystem: true },
        { name: 'Achat stock', description: 'Achats de matieres premieres lies aux entrees stock', isSystem: true },
        { name: 'Salaires', description: 'Paiements des salaires du personnel', isSystem: true },
        { name: 'Avances salaires', description: 'Avances versees au personnel', isSystem: true }
      ],
      skipDuplicates: true
    });
    await tx.ingredient.createMany({ data: ingredientSeed });

    const ingredients = await tx.ingredient.findMany({ select: { id: true, name: true } });
    const ingredientByName = new Map(ingredients.map((item) => [item.name, item.id]));

    const menuCategories = await tx.menuCategory.findMany({ select: { id: true, name: true } });
    const menuCategoryByName = new Map(menuCategories.map((item) => [item.name, item.id]));

    await tx.product.createMany({
      data: productSeed.map((product) => {
        const { stockItemName, ...productData } = product;
        return {
          ...productData,
          categoryId: menuCategoryByName.get(product.category ?? 'General') ?? null,
          stockItemId: stockItemName ? ingredientByName.get(stockItemName) ?? null : null
        };
      })
    });

    const ingredientUnitByName = new Map(ingredients.map((item) => [item.name, ingredientSeed.find((seed) => seed.name === item.name)?.unit ?? 'portion']));
    const products = await tx.product.findMany({ select: { id: true, name: true, price: true, sourceType: true, stockItemId: true, saleUnitQuantity: true } });
    const productByName = new Map(products.map((item) => [item.name, item.id]));
    const productPriceByName = new Map(products.map((item) => [item.name, Number(item.price)]));
    const productById = new Map(products.map((item) => [item.id, item]));

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
            id: true,
            ingredientId: true,
            quantity: true,
            totalPrice: true,
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

    await tx.stockMovement.createMany({
      data: [
        {
          ingredientId: ingredientByName.get('Laitue')!,
          type: StockMovementType.OUT,
          quantity: 250,
          reason: StockMovementReason.loss,
          date: new Date()
        },
        {
          ingredientId: ingredientByName.get('Pain burger')!,
          type: StockMovementType.OUT,
          quantity: 2,
          reason: StockMovementReason.loss,
          date: new Date()
        }
      ]
    });

    const expenseCategories = await tx.expenseCategory.findMany({ select: { id: true, name: true } });
    const expenseCategoryByName = new Map(expenseCategories.map((item) => [item.name, item.id]));
    const ingredientNameById = new Map(ingredients.map((item) => [item.id, item.name]));

    await tx.expense.createMany({
      data: purchases.map((purchase) => ({
        amount: purchase.totalPrice,
        category: 'Achat stock',
        categoryId: expenseCategoryByName.get('Achat stock') ?? null,
        type: 'variable',
        status: 'paid',
        paymentMethod: 'cash',
        supplierName: 'Fournisseur demo',
        description: `Achat stock seed - ${ingredientNameById.get(purchase.ingredientId) ?? 'Matiere'}`,
        sourceType: 'stock_purchase',
        sourceId: purchase.id,
        sourceLabel: ingredientNameById.get(purchase.ingredientId) ?? 'Matiere',
        paidAt: purchase.date,
        date: purchase.date
      })),
      skipDuplicates: true
    });

    await tx.expense.createMany({
      data: [
        {
          amount: 8500,
          category: 'Loyer',
          categoryId: expenseCategoryByName.get('Loyer') ?? null,
          type: 'fixed',
          status: 'paid',
          paymentMethod: 'transfer',
          description: 'Quote-part journaliere du local'
        },
        {
          amount: 2400,
          category: 'Services',
          categoryId: expenseCategoryByName.get('Services') ?? null,
          type: 'variable',
          status: 'paid',
          paymentMethod: 'cash',
          description: 'Electricite, eau et internet'
        },
        {
          amount: 3200,
          category: 'Personnel',
          categoryId: expenseCategoryByName.get('Personnel') ?? null,
          type: 'variable',
          status: 'planned',
          paymentMethod: 'cash',
          description: 'Prime d equipe et caisse'
        }
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
      const directStockMovements = order.items.flatMap((item) => {
        const productId = productByName.get(item.productName)!;
        const product = productById.get(productId);
        if (product?.sourceType !== 'direct_stock' || !product.stockItemId) return [];
        return [
          {
            ingredientId: product.stockItemId,
            type: StockMovementType.OUT,
            quantity: Number(product.saleUnitQuantity) * item.quantity,
            reason: StockMovementReason.sale,
            date: order.createdAt
          }
        ];
      });

      await tx.stockMovement.createMany({
        data: [
          ...recipes.map((recipe) => ({
            ingredientId: recipe.ingredientId,
            type: StockMovementType.OUT,
            quantity: Number(recipe.quantity) * (orderItemsByProductId.get(recipe.productId) ?? 0),
            reason: StockMovementReason.sale,
            date: order.createdAt
          })),
          ...directStockMovements
        ]
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

    const employees = await tx.employeeProfile.findMany({
      include: {
        user: true
      },
      take: 2
    });

    if (employees.length > 0) {
      for (const [index, employee] of employees.entries()) {
        await tx.employeeProfile.update({
          where: { id: employee.id },
          data: {
            position: index === 0 ? 'Gerant' : 'Caissier',
            employmentType: 'monthly',
            baseSalary: index === 0 ? 68000 : 42000,
            hireDate: new Date('2026-01-15T00:00:00.000Z'),
            isActive: true
          }
        });
      }

      const payrollPeriod = await tx.payrollPeriod.create({
        data: {
          label: 'Paie Avril 2026',
          startDate: new Date('2026-04-01T00:00:00.000Z'),
          endDate: new Date('2026-04-30T23:59:59.000Z'),
          status: 'validated',
          notes: 'Periode de demonstration'
        }
      });

      for (const [index, employee] of employees.entries()) {
        const baseSalary = index === 0 ? 68000 : 42000;
        const bonuses = index === 0 ? 6000 : 2500;
        const deductions = index === 0 ? 0 : 1200;

        const advance = await tx.salaryAdvance.create({
          data: {
            employeeId: employee.id,
            amount: index === 0 ? 5000 : 3000,
            remainingAmount: index === 0 ? 1000 : 0,
            reason: 'Avance exceptionnelle',
            note: 'Exemple seed',
            date: new Date('2026-04-10T00:00:00.000Z')
          }
        });

        await tx.expense.create({
          data: {
            amount: advance.amount,
            category: 'Avances salaires',
            categoryId: expenseCategoryByName.get('Avances salaires') ?? null,
            type: 'variable',
            status: 'paid',
            paymentMethod: 'cash',
            supplierName: employee.user.fullName,
            description: `Avance salaire seed - ${employee.user.fullName}`,
            sourceType: 'salary_advance',
            sourceId: advance.id,
            sourceLabel: employee.user.fullName,
            paidAt: advance.date,
            date: advance.date
          }
        });

        const advanceDeduction = index === 0 ? 4000 : 3000;
        const netSalary = baseSalary + bonuses - deductions - advanceDeduction;

        const entry = await tx.payrollEntry.create({
          data: {
            periodId: payrollPeriod.id,
            employeeId: employee.id,
            baseSalary,
            bonuses,
            deductions,
            advanceDeduction,
            netSalary,
            notes: 'Ligne de paie seed'
          }
        });

        await tx.salaryAdvanceSettlement.create({
          data: {
            advanceId: advance.id,
            entryId: entry.id,
            amount: advanceDeduction
          }
        });

        const payment = await tx.payrollPayment.create({
          data: {
            entryId: entry.id,
            amount: index === 0 ? netSalary - 5000 : netSalary,
            method: index === 0 ? 'transfer' : 'cash',
            paidAt: new Date('2026-04-28T10:00:00.000Z'),
            note: 'Paiement de demonstration'
          }
        });

        await tx.expense.create({
          data: {
            amount: payment.amount,
            category: 'Salaires',
            categoryId: expenseCategoryByName.get('Salaires') ?? null,
            type: 'variable',
            status: 'paid',
            paymentMethod: payment.method,
            supplierName: employee.user.fullName,
            description: `Paiement salaire seed - ${employee.user.fullName}`,
            sourceType: 'payroll_payment',
            sourceId: payment.id,
            sourceLabel: employee.user.fullName,
            paidAt: payment.paidAt,
            date: payment.paidAt
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
