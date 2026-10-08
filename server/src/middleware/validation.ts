/** Boundary validation helpers. Parsers collect field errors and throw one 400 response. */
import { validationError } from '../errors.ts';
import { isIsoDate, isPeriod } from '../services/domain/dates.ts';

export class FieldErrors {
  readonly fields: Record<string, string> = {};

  add(field: string, message: string): void {
    if (!(field in this.fields)) this.fields[field] = message;
  }

  check(ok: boolean, field: string, message: string): void {
    if (!ok) this.add(field, message);
  }

  throwIfAny(): void {
    if (Object.keys(this.fields).length > 0) throw validationError(this.fields);
  }
}

export type Body = Record<string, unknown>;

/** Request bodies must be JSON objects. */
export function asObject(value: unknown): Body {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw validationError({ body: 'Send a JSON object.' });
  return value as Body;
}

export const isString = (v: unknown): v is string => typeof v === 'string';
export const isNonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
export const isCents = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
export const isNonNegativeCents = (v: unknown): v is number => isCents(v) && v >= 0;
export const isPositiveCents = (v: unknown): v is number => isCents(v) && v > 0;
export const isIntInRange = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
export const isOptionalDate = (v: unknown): v is string | null => v === null || isIsoDate(v);
export const isObjectId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v);

export function oneOf<T extends string>(values: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (values as readonly string[]).includes(v);
}

/** Validates a `:period` path segment or `?period=` query value. */
export function parsePeriod(value: unknown, field = 'period'): string {
  const e = new FieldErrors();
  e.check(isPeriod(value), field, 'Use the YYYY-MM format.');
  e.throwIfAny();
  return value as string;
}
