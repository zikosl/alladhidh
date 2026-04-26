# Restaurant POS Monorepo

TypeScript restaurant POS stack with:

- [backend](/Users/zakaria/Desktop/alladhidh/backend): Express + Prisma + PostgreSQL API for products, orders, kitchen, payments, stock, and dashboard reporting
- [admin](/Users/zakaria/Desktop/alladhidh/admin): React + Tailwind + Zustand POS web app optimized for fast ordering, kitchen display, cashier, admin, and delivery workflows

Run the full stack from the parent folder:

```bash
docker compose up --build
```

Production stack:

```bash
docker compose -f docker-compose.prod.yml up --build
```

Services:

- Admin UI: [http://localhost:8080](http://localhost:8080)
- Backend API: [http://localhost:3000](http://localhost:3000)
- PostgreSQL: `localhost:5432`

Useful notes:

- The database structure is initialized by Prisma from [schema.prisma](/Users/zakaria/Desktop/alladhidh/backend/prisma/schema.prisma:1)
- Demo data is generated through Prisma in [backend/src/scripts/seed.ts](/Users/zakaria/Desktop/alladhidh/backend/src/scripts/seed.ts:1)
- If you already created the Postgres volume and want the new schema/seed to re-run, use `docker compose down -v` before bringing the stack back up
- `docker-compose.yml` is the live-reload dev setup
- `docker-compose.prod.yml` is the production-style setup using [backend/Dockerfile.prod](/Users/zakaria/Desktop/alladhidh/backend/Dockerfile.prod:1) and [admin/Dockerfile.prod](/Users/zakaria/Desktop/alladhidh/admin/Dockerfile.prod:1)
