import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { dashboardRouter } from './routes/dashboard';
import { inventoryRouter } from './routes/inventory';
import { kitchenRouter } from './routes/kitchen';
import { menuRouter } from './routes/menu';
import { ordersRouter } from './routes/orders';
import { paymentsRouter } from './routes/payments';
import { productsRouter } from './routes/products';
import { requireAuth } from './lib/authMiddleware';
import { prisma } from './lib/prisma';
import { HttpError } from './utils/httpError';

export const app = express();

const allowedOrigins = process.env.CLIENT_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? [];
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    }
  })
);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Restaurant POS API is running' });
});

app.get('/ready', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'Restaurant POS API is ready' });
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRouter);
app.use('/api', requireAuth);
app.use('/api/inventory', inventoryRouter);
app.use('/api/menu-items', menuRouter);
app.use('/api/recipes', menuRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/kitchen', kitchenRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api', dashboardRouter);

app.use((_req, _res, next) => {
  next(new HttpError(404, 'Route not found'));
});

app.use((error: Error | HttpError, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && isProduction ? 'Internal server error' : error.message || 'Internal server error'
  });
});
