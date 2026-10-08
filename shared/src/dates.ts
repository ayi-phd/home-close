/**
 * ISO date (`YYYY-MM-DD`) and close period (`YYYY-MM`) arithmetic.
 * Everything is calendar math in UTC so results never shift with the viewer's time zone.
 */
import type { IsoDate, Period } from './types.ts';

const pad = (n: number) => String(n).padStart(2, '0');

export function toIso(year: number, month: number, day: number): IsoDate {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseIso(date: IsoDate): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number);
  return { year: year!, month: month!, day: day! };
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseIso(value);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function isPeriod(value: unknown): value is Period {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const { year, month, day } = parseIso(date);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** 0 = Sunday. */
export function weekday(date: IsoDate): number {
  const { year, month, day } = parseIso(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function periodOf(date: IsoDate): Period {
  return date.slice(0, 7);
}

export function parsePeriod(period: Period): { year: number; month: number } {
  return { year: Number(period.slice(0, 4)), month: Number(period.slice(5, 7)) };
}

export function toPeriod(year: number, month: number): Period {
  return `${year}-${pad(month)}`;
}

export function addMonths(period: Period, months: number): Period {
  const { year, month } = parsePeriod(period);
  const index = year * 12 + (month - 1) + months;
  return toPeriod(Math.floor(index / 12), (index % 12) + 1);
}

export function periodStart(period: Period): IsoDate {
  return `${period}-01`;
}

export function periodEnd(period: Period): IsoDate {
  const { year, month } = parsePeriod(period);
  return toIso(year, month, daysInMonth(year, month));
}

/** Day `day` of the month, clamped to the month's length (statement day 31 in February → 28/29). */
export function clampedDate(year: number, month: number, day: number): IsoDate {
  return toIso(year, month, Math.min(day, daysInMonth(year, month)));
}
