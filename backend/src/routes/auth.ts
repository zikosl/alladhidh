import { Router } from 'express';
import { requireAuth } from '../lib/authMiddleware';
import { asyncHandler } from '../lib/asyncHandler';
import { loginUser } from '../services/authService';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = await loginUser(req.body);
    res.json({ success: true, data });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: req.authUser });
  })
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ success: true });
  })
);
