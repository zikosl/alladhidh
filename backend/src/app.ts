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
import { HttpError } from './utils/httpError';

export const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(',') ?? true
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Restaurant POS API is running' });
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
    message: error.message || 'Internal server error'
  });
});
