# Production Deployment

This stack runs the app behind Caddy:

- `caddy`: public entrypoint, HTTPS when `CADDY_SITE_ADDRESS` is a real domain
- `admin`: static React app served by Caddy with SPA fallback
- `backend`: private Express API
- `backend-migrate`: one-shot Prisma database preparation and seed guard
- `postgres`: private PostgreSQL database

## 1. Configure environment

```sh
cp .env.production.example .env.production
```

Edit `.env.production` and set strong values for:

- `POSTGRES_PASSWORD`
- `ADMIN_PASSWORD`
- `CADDY_SITE_ADDRESS`
- `CLIENT_ORIGIN`

For a local production smoke test, keep:

```env
CADDY_SITE_ADDRESS=:80
CLIENT_ORIGIN=*
```

For a real domain:

```env
CADDY_SITE_ADDRESS=example.com
CLIENT_ORIGIN=https://example.com
```

## 2. Start production

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 3. Check services

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f caddy backend
```

Health endpoints:

- `/health`: API process is running
- `/ready`: API can reach PostgreSQL

## Notes

- PostgreSQL, backend, and admin are not exposed publicly.
- Caddy is the only public service.
- `/api/*`, `/health`, and `/ready` are proxied to the backend.
- All other routes go to the React app and support direct URLs like `/stock` and `/pos/cuisine`.
