import { AuthUserSummary } from './pos';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUserSummary;
    }
  }
}

export {};
