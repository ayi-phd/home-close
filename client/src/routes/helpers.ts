/** Shared helpers for route loaders and actions: form parsing and API error mapping. */
import { data } from 'react-router';
import { ApiError, type NewTransactionInput } from '../api';
import { isPeriod } from '../api/dates';
import { parseMoney } from '../components/format';

export interface ActionResult {
  ok?: boolean;
  errors?: Record<string, string>;
  formError?: string;
}

export function str(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function strOrNull(form: FormData, name: string): string | null {
  return str(form, name) || null;
}

/** Cents from a money field. Unparseable text becomes NaN so the API reports a field error. */
export function money(form: FormData, name: string): number {
  return parseMoney(str(form, name)) ?? Number.NaN;
}

export function moneyOrNull(form: FormData, name: string): number | null {
  return str(form, name) === '' ? null : money(form, name);
}

/** Integer field: blank → null, anything else that isn't an integer → NaN. */
export function intOrNull(form: FormData, name: string): number | null {
  const value = str(form, name);
  if (value === '') return null;
  return /^-?\d+$/.test(value) ? Number(value) : Number.NaN;
}

/** Turns API validation and conflict errors into action data the form can show. */
export function toActionError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) return data<ActionResult>({ errors: error.fields ?? {}, formError: error.fields ? undefined : error.message }, 400);
    return data<ActionResult>({ formError: error.message }, error.status);
  }
  throw error;
}

export function requirePeriodParam(value: string | undefined): string {
  if (!value || !isPeriod(value)) throw data('Not found', 404);
  return value;
}

export function parseTransactionForm(form: FormData): NewTransactionInput {
  const kind = str(form, 'kind');
  const base = { date: str(form, 'date'), description: str(form, 'description'), accountId: str(form, 'accountId'), amount: money(form, 'amount') };
  if (kind === 'transfer') return { ...base, kind, toAccountId: str(form, 'toAccountId') };
  return { ...base, kind: kind === 'deposit' ? 'deposit' : 'expense', category: str(form, 'category') };
}
