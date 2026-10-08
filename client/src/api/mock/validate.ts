/** Request validation for the mock API, returning `400 { code: 'validation_failed', fields }`. */
import { ApiError } from '../types';
import { isIsoDate } from '../dates';

export class FieldErrors {
  readonly fields: Record<string, string> = {};

  add(field: string, message: string): void {
    if (!(field in this.fields)) this.fields[field] = message;
  }

  check(ok: boolean, field: string, message: string): void {
    if (!ok) this.add(field, message);
  }

  throwIfAny(): void {
    if (Object.keys(this.fields).length > 0) {
      throw new ApiError(400, { code: 'validation_failed', message: 'Some fields need attention.', fields: this.fields });
    }
  }
}

export const isNonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
export const isCents = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
export const isNonNegativeCents = (v: unknown): v is number => isCents(v) && v >= 0;
export const isIntInRange = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
export const isOptionalDate = (v: unknown) => v === null || isIsoDate(v);

export function oneOf<T extends string>(values: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (values as readonly string[]).includes(v);
}

export const notFound = (what: string) => new ApiError(404, { code: 'not_found', message: `${what} not found.` });
export const conflict = (code: string, message: string) => new ApiError(409, { code, message });
