import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/security';

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
    ['tables.manage', 'Gestion tables', 'parametres']
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
      'tables.manage'
    ],
    Caissier: ['pos.use', 'pos.cashier', 'sales.read'],
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
