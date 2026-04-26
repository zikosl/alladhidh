import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/security';

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS menu_categories (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name VARCHAR(80) NOT NULL UNIQUE,
      description VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE menu_categories
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE menu_categories
    SET
      created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
      updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10, 2) NOT NULL DEFAULT 0
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO menu_categories (name, created_at, updated_at)
    SELECT DISTINCT COALESCE(NULLIF(TRIM(category), ''), 'General'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM products
    ON CONFLICT (name) DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO menu_categories (name, created_at, updated_at)
    VALUES ('General', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (name) DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE products p
    SET category_id = mc.id
    FROM menu_categories mc
    WHERE p.category_id IS NULL
      AND mc.name = COALESCE(NULLIF(TRIM(p.category), ''), 'General')
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_category_id_fkey
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE products
    ADD CONSTRAINT products_category_id_fkey
    FOREIGN KEY (category_id)
    REFERENCES menu_categories(id)
    ON DELETE SET NULL
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_subcategory_id_fkey
  `);

  await prisma.$executeRawUnsafe(`
    DROP INDEX IF EXISTS idx_products_subcategory_id
  `);

  await prisma.$executeRawUnsafe(`
    DROP INDEX IF EXISTS idx_menu_subcategories_category_id
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE products
    DROP COLUMN IF EXISTS subcategory_id
  `);

  await prisma.$executeRawUnsafe(`
    DROP TABLE IF EXISTS menu_subcategories
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS unit VARCHAR(20) NOT NULL DEFAULT 'g'
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE recipes r
    SET unit = CASE
      WHEN i.unit IN ('kg', 'g') THEN 'g'
      WHEN i.unit IN ('liter', 'ml') THEN 'ml'
      ELSE 'portion'
    END
    FROM ingredients i
    WHERE r.ingredient_id = i.id
      AND (r.unit IS NULL OR r.unit = '' OR r.unit = 'g')
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE products p
    SET estimated_cost = COALESCE(costs.total_cost, 0)
    FROM (
      SELECT
        r.product_id,
        ROUND(SUM(
          CASE
            WHEN r.unit = i.unit THEN CAST(r.quantity AS DECIMAL)
            WHEN r.unit = 'g' AND i.unit = 'kg' THEN CAST(r.quantity AS DECIMAL) / 1000
            WHEN r.unit = 'kg' AND i.unit = 'g' THEN CAST(r.quantity AS DECIMAL) * 1000
            WHEN r.unit = 'ml' AND i.unit = 'liter' THEN CAST(r.quantity AS DECIMAL) / 1000
            WHEN r.unit = 'liter' AND i.unit = 'ml' THEN CAST(r.quantity AS DECIMAL) * 1000
            ELSE CAST(r.quantity AS DECIMAL)
          END * i.purchase_price
        )::numeric, 2) AS total_cost
      FROM recipes r
      JOIN ingredients i ON i.id = r.ingredient_id
      GROUP BY r.product_id
    ) AS costs
    WHERE p.id = costs.product_id
      AND COALESCE(p.estimated_cost, 0) = 0
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ingredient_categories (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name VARCHAR(80) NOT NULL UNIQUE,
      description VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE ingredient_categories
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE ingredient_categories
    SET
      created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
      updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO ingredient_categories (name, created_at, updated_at)
    SELECT DISTINCT COALESCE(NULLIF(TRIM(category), ''), 'General'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM ingredients
    ON CONFLICT (name) DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO ingredient_categories (name, created_at, updated_at)
    VALUES ('General', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (name) DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE ingredients
    DROP CONSTRAINT IF EXISTS ingredients_measurement_type_check
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE ingredients
    SET measurement_type = 'portion'
    WHERE measurement_type = 'unit'
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE ingredients
    ADD CONSTRAINT ingredients_measurement_type_check
    CHECK (measurement_type IN ('portion', 'weight', 'volume'))
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE ingredients
    DROP CONSTRAINT IF EXISTS ingredients_category_fkey
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE ingredients
    ADD CONSTRAINT ingredients_category_fkey
    FOREIGN KEY (category)
    REFERENCES ingredient_categories(name)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
  `);

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
      restaurantName: 'Restaurant Suite',
      currency: 'DZD',
      defaultDeliveryFee: 200,
      lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD ?? 1000),
      receiptFooter: 'Merci pour votre visite.'
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
