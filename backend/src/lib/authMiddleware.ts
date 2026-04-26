import { NextFunction, Request, Response } from 'express';
import { getCurrentUserFromToken } from '../services/authService';
import { HttpError } from '../utils/httpError';

function extractBearerToken(request: Request) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim();
}

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      throw new HttpError(401, 'Authentification requise');
    }

    request.authUser = await getCurrentUserFromToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(...permissionCodes: string[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const authUser = request.authUser;
    if (!authUser) {
      return next(new HttpError(401, 'Authentification requise'));
    }

    const allowed = permissionCodes.some((permission) => authUser.permissions.includes(permission));
    if (!allowed) {
      return next(new HttpError(403, 'Permission insuffisante'));
    }

    next();
  };
}
