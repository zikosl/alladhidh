import { HttpError } from './httpError';

export function requireField<T extends object>(payload: T, field: keyof T): void {
  const value = payload[field];
  if (value === undefined || value === null || value === '') {
    throw new HttpError(400, `Field "${String(field)}" is required`);
  }
}

export function toPositiveNumber(value: unknown, fieldName: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new HttpError(400, `Field "${fieldName}" must be a positive number`);
  }
  return numeric;
}

export function toNonNegativeNumber(value: unknown, fieldName: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new HttpError(400, `Field "${fieldName}" must be a non-negative number`);
  }
  return numeric;
}
