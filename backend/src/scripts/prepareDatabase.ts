import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/security';

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function main() {
  const permissions = [
    ['inventory.read', 'Lecture stock', 'stock'],
    ['inventory.write', 'Gestion stock', 'stock'],
    ['recipes.read', 'Lecture recettes', 'recettes'],
    ['recipes.write', 'Gestion recettes', 'recettes'],
    ['pos.use', 'Prise de commande', 'pos'],
    ['pos.kitchen', 'Poste cuisine', 'pos'],
    ['pos.cashier', 'Poste caisse', 'pos'],
    ['pos.delivery', 'Poste livraison', 'pos'],
    ['sales.read', 'Lecture ventes', 'ventes'],
    ['reports.read', 'Lecture rapports', 'rapports'],
    ['finance.read', 'Lecture depenses', 'finance'],
    ['finance.write', 'Gestion depenses', 'finance'],
    ['payroll.read', 'Lecture paie', 'finance'],
    ['payroll.write', 'Gestion paie', 'finance'],
    ['settings.read', 'Lecture parametres', 'parametres'],
    ['settings.write', 'Edition parametres', 'parametres'],
    ['staff.manage', 'Gestion equipe', 'parametres'],
    ['roles.manage', 'Gestion roles', 'parametres'],
    ['tables.manage', 'Gestion tables', 'parametres'],
    ['alerts.read', 'Lecture rappels', 'alertes'],
    ['alerts.write', 'Gestion rappels', 'alertes']
  ] as const;

  for (const [code, label, module] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { label, module },
      create: { code, label, module }
    });
  }

  const rolePermissions: Record<string, string[]> = {
    'Super Admin': permissions.map(([code]) => code),
    Manager: [
      'inventory.read',
      'inventory.write',
      'recipes.read',
      'recipes.write',
      'pos.use',
      'pos.kitchen',
      'pos.cashier',
      'pos.delivery',
      'sales.read',
      'reports.read',
      'finance.read',
      'finance.write',
      'payroll.read',
      'payroll.write',
      'settings.read',
      'tables.manage',
      'alerts.read',
      'alerts.write'
    ],
    Caissier: ['pos.use', 'pos.cashier', 'sales.read', 'alerts.read'],
    Cuisinier: ['pos.kitchen'],
    Serveur: ['pos.use'],
    Livreur: ['pos.delivery']
  };

  for (const [name, permissionCodes] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `Role systeme: ${name}`
      }
    });

    const permissionRows = await prisma.permission.findMany({
      where: {
        code: {
          in: permissionCodes
        }
      }
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionRows.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });
  }

  await prisma.restaurantSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      restaurantName: 'اللذيذ',
      currency: 'DZD',
      defaultDeliveryFee: 200,
      lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD ?? 1000),
      receiptTitle: 'Facture client',
      receiptSubtitle: 'Cuisine rapide & service moderne',
      receiptAddress: 'Alger, Algerie',
      receiptPhone: '0550 00 00 00',
      receiptInstagram: '@restaurant_suite',
      receiptWhatsapp: '0550 00 00 00',
      receiptFooter: 'Merci pour votre visite.',
      kitchenTicketHeader: 'Preparation cuisine',
      kitchenTicketFooter: 'Service en cours',
      showContactBlock: true,
      showSocialLinks: true,
      showFooterNote: true,
      showLogoInKitchenTicket: false,
      autoPrintKitchenTicket: true
    }
  });

  await prisma.payrollSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      paymentMode: 'daily',
      defaultDailyAmount: 0,
      monthlyDivisor: 30,
      allowNegativeBalance: true,
      autoDeductAcompte: true
    }
  });

  const defaultTables = [
    { name: 'A1', zone: 'Salle principale', capacity: 4 },
    { name: 'A2', zone: 'Salle principale', capacity: 4 },
    { name: 'B1', zone: 'Terrasse', capacity: 2 },
    { name: 'B2', zone: 'Terrasse', capacity: 2 }
  ];

  for (const table of defaultTables) {
    await prisma.restaurantTable.upsert({
      where: { name: table.name },
      update: {},
      create: table
    });
  }

  const defaultShifts = [
    { name: 'Matin', startTime: '08:00', endTime: '16:00', autoCloseMinutes: 15 },
    { name: 'Soir', startTime: '16:00', endTime: '00:00', autoCloseMinutes: 15 }
  ];

  for (const shift of defaultShifts) {
    await prisma.shiftTemplate.upsert({
      where: { name: shift.name },
      update: {
        startTime: shift.startTime,
        endTime: shift.endTime,
        activeDays: '0,1,2,3,4,5,6',
        autoCloseMinutes: shift.autoCloseMinutes,
        isActive: true
      },
      create: {
        ...shift,
        activeDays: '0,1,2,3,4,5,6',
        isActive: true
      }
    });
  }

  const stockCategoryUsage = [
    { name: 'General', usageType: 'recipe_only' },
    { name: 'Boulangerie', usageType: 'recipe_only' },
    { name: 'Proteines', usageType: 'recipe_only' },
    { name: 'Produits laitiers', usageType: 'recipe_only' },
    { name: 'Legumes', usageType: 'recipe_only' },
    { name: 'Surgeles', usageType: 'recipe_only' },
    { name: 'Consommables', usageType: 'recipe_only' },
    { name: 'Sauces', usageType: 'recipe_only' },
    { name: 'Epicerie', usageType: 'recipe_only' },
    { name: 'Boissons', usageType: 'both' }
  ] as const;

  for (const category of stockCategoryUsage) {
    await prisma.ingredientCategory.upsert({
      where: { name: category.name },
      update: { usageType: category.usageType },
      create: {
        name: category.name,
        usageType: category.usageType
      }
    });
  }

  const waterIngredient = await prisma.ingredient.findUnique({ where: { name: 'Bouteille eau' } });
  const waterProduct = await prisma.product.findUnique({ where: { name: 'Eau minerale' } });
  if (waterIngredient && waterProduct) {
    await prisma.ingredient.update({
      where: { id: waterIngredient.id },
      data: { usageType: 'direct_sale' }
    });
    await prisma.product.update({
      where: { id: waterProduct.id },
      data: {
        sourceType: 'direct_stock',
        stockItemId: waterIngredient.id,
        saleUnitQuantity: 1,
        estimatedCost: waterIngredient.purchasePrice,
        isActive: true
      }
    });
    await prisma.recipe.deleteMany({
      where: {
        productId: waterProduct.id,
        ingredientId: waterIngredient.id
      }
    });
  }

  const expenseCategories = [
    ['Loyer', 'Charges fixes mensuelles'],
    ['Electricite', 'Consommation electrique'],
    ['Gaz', 'Consommation cuisine'],
    ['Internet', 'Connexion & telecom'],
    ['Transport', 'Livraisons & deplacements'],
    ['Maintenance', 'Reparations & entretien'],
    ['Emballage', 'Sachets, boites, gobelets'],
    ['Achat stock', 'Achats de matieres premieres lies aux entrees stock'],
    ['Salaires', 'Paiements des salaires du personnel'],
    ['Avances salaires', 'Avances versees au personnel'],
    ['Divers', 'Autres depenses']
  ] as const;

  for (const [name, description] of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: { description, isSystem: true },
      create: { name, description, isSystem: true }
    });
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
  if (adminRole) {
    await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        fullName: 'Administrateur principal',
        username: 'admin',
        email: 'admin@restaurant.local',
        passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'admin123'),
        roleId: adminRole.id,
        status: 'active'
      }
    });
  }

  const users = await prisma.user.findMany({
    include: {
      role: true
    }
  });

  for (const user of users) {
    await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      update: {
        isActive: user.status === 'active'
      },
      create: {
        userId: user.id,
        position: user.role.name,
        employmentType: 'monthly',
        baseSalary: 0,
        isActive: user.status === 'active'
      }
    });
  }

  const cashSessions = await prisma.cashSession.findMany();
  const cashSessionByDate = new Map(cashSessions.map((session) => [dateOnly(session.businessDate), session]));

  const payments = await prisma.payment.findMany({
    include: { sale: true }
  });
  for (const payment of payments) {
    const session = cashSessionByDate.get(dateOnly(startOfDay(payment.createdAt)));
    await prisma.financeTransaction.upsert({
      where: {
        type_sourceModule_sourceId: {
          type: 'sale_payment',
          sourceModule: 'pos',
          sourceId: payment.id
        }
      },
      update: {
        direction: 'in',
        amount: payment.amount,
        status: 'paid',
        paymentMethod: payment.method,
        sourceLabel: `Commande #${payment.saleId}`,
        description: `Encaissement commande #${payment.saleId}`,
        cashSessionId: session?.id ?? null,
        orderId: payment.saleId,
        occurredAt: payment.createdAt
      },
      create: {
        type: 'sale_payment',
        direction: 'in',
        amount: payment.amount,
        status: 'paid',
        paymentMethod: payment.method,
        sourceModule: 'pos',
        sourceType: 'payment',
        sourceId: payment.id,
        sourceLabel: `Commande #${payment.saleId}`,
        description: `Encaissement commande #${payment.saleId}`,
        cashSessionId: session?.id ?? null,
        orderId: payment.saleId,
        occurredAt: payment.createdAt
      }
    });
  }

  const expenses = await prisma.expense.findMany();
  for (const expense of expenses) {
    const type =
      expense.sourceType === 'stock_purchase'
        ? 'stock_purchase'
        : expense.sourceType === 'payroll_payment'
          ? 'payroll_payment'
          : expense.sourceType === 'salary_advance'
            ? 'salary_advance'
            : 'manual_expense';
    const sourceModule =
      expense.sourceType === 'stock_purchase'
        ? 'stock'
        : expense.sourceType === 'manual'
          ? 'finance'
          : 'payroll';
    const status =
      expense.status === 'planned' ? 'pending' : expense.status === 'partial' ? 'partial' : expense.status === 'cancelled' ? 'cancelled' : 'paid';
    const session = cashSessionByDate.get(dateOnly(startOfDay(expense.date)));
    await prisma.financeTransaction.upsert({
      where: {
        type_sourceModule_sourceId: {
          type,
          sourceModule,
          sourceId: expense.sourceType === 'manual' ? expense.id : expense.sourceId ?? expense.id
        }
      },
      update: {
        direction: 'out',
        amount: expense.amount,
        status,
        paymentMethod: expense.paymentMethod,
        sourceLabel: expense.sourceLabel ?? expense.category,
        description: expense.description,
        cashSessionId: session?.id ?? null,
        expenseId: expense.id,
        occurredAt: expense.date
      },
      create: {
        type,
        direction: 'out',
        amount: expense.amount,
        status,
        paymentMethod: expense.paymentMethod,
        sourceModule,
        sourceType: expense.sourceType,
        sourceId: expense.sourceType === 'manual' ? expense.id : expense.sourceId ?? expense.id,
        sourceLabel: expense.sourceLabel ?? expense.category,
        description: expense.description,
        cashSessionId: session?.id ?? null,
        expenseId: expense.id,
        occurredAt: expense.date
      }
    });
  }

  const payrollAdjustments = await prisma.payrollAdjustment.findMany({
    include: {
      employee: {
        include: { user: true }
      }
    }
  });
  for (const adjustment of payrollAdjustments) {
    await prisma.financeTransaction.upsert({
      where: {
        type_sourceModule_sourceId: {
          type: 'payroll_adjustment',
          sourceModule: 'payroll',
          sourceId: adjustment.id
        }
      },
      update: {
        direction: 'neutral',
        amount: adjustment.amount,
        status: 'paid',
        sourceType: adjustment.type,
        sourceLabel: (adjustment.employee.user?.fullName ?? adjustment.employee.fullName ?? 'Employe'),
        description: `${adjustment.type === 'penalty' ? 'Penalite' : 'Retenue'} - ${adjustment.reason}`,
        employeeId: adjustment.employeeId,
        occurredAt: adjustment.date
      },
      create: {
        type: 'payroll_adjustment',
        direction: 'neutral',
        amount: adjustment.amount,
        status: 'paid',
        sourceModule: 'payroll',
        sourceType: adjustment.type,
        sourceId: adjustment.id,
        sourceLabel: (adjustment.employee.user?.fullName ?? adjustment.employee.fullName ?? 'Employe'),
        description: `${adjustment.type === 'penalty' ? 'Penalite' : 'Retenue'} - ${adjustment.reason}`,
        employeeId: adjustment.employeeId,
        occurredAt: adjustment.date
      }
    });
  }

  for (const session of cashSessions) {
    await prisma.financeTransaction.upsert({
      where: {
        type_sourceModule_sourceId: {
          type: 'cash_opening',
          sourceModule: 'caisse',
          sourceId: session.id
        }
      },
      update: {
        direction: 'neutral',
        amount: session.openingAmount,
        status: 'paid',
        paymentMethod: 'cash',
        sourceLabel: dateOnly(session.businessDate),
        description: `Ouverture caisse - ${dateOnly(session.businessDate)}`,
        cashSessionId: session.id,
        createdById: session.openedById,
        occurredAt: session.openedAt
      },
      create: {
        type: 'cash_opening',
        direction: 'neutral',
        amount: session.openingAmount,
        status: 'paid',
        paymentMethod: 'cash',
        sourceModule: 'caisse',
        sourceType: 'cash_session',
        sourceId: session.id,
        sourceLabel: dateOnly(session.businessDate),
        description: `Ouverture caisse - ${dateOnly(session.businessDate)}`,
        cashSessionId: session.id,
        createdById: session.openedById,
        occurredAt: session.openedAt
      }
    });
    if (session.status === 'closed') {
      await prisma.financeTransaction.upsert({
        where: {
          type_sourceModule_sourceId: {
            type: 'cash_closing',
            sourceModule: 'caisse',
            sourceId: session.id
          }
        },
        update: {
          direction: 'neutral',
          amount: session.closingAmount ?? 0,
          status: 'paid',
          paymentMethod: 'cash',
          sourceLabel: dateOnly(session.businessDate),
          description: `Cloture caisse - ${dateOnly(session.businessDate)}`,
          cashSessionId: session.id,
          createdById: session.closedById,
          occurredAt: session.closedAt ?? session.updatedAt
        },
        create: {
          type: 'cash_closing',
          direction: 'neutral',
          amount: session.closingAmount ?? 0,
          status: 'paid',
          paymentMethod: 'cash',
          sourceModule: 'caisse',
          sourceType: 'cash_session',
          sourceId: session.id,
          sourceLabel: dateOnly(session.businessDate),
          description: `Cloture caisse - ${dateOnly(session.businessDate)}`,
          cashSessionId: session.id,
          createdById: session.closedById,
          occurredAt: session.closedAt ?? session.updatedAt
        }
      });
    }
  }

  console.log('Database stock constraints and security defaults are ready.');
}

main()
  .catch((error) => {
    console.error('Database preparation failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
