/** UI-edge formatting and parsing. Money stays integer cents until it is rendered. */
import type { Cents, IsoDate, Period } from '../api/types';
import { parseIso, parsePeriod } from '../api/dates';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MINUS = '−';

/** $1,284.55 · −$84.27 · with `sign`, +$3,850.00. */
export function formatMoney(cents: Cents, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(cents);
  const dollars = Math.trunc(abs / 100).toLocaleString('en-US');
  const text = `$${dollars}.${String(abs % 100).padStart(2, '0')}`;
  if (cents < 0) return MINUS + text;
  return opts.sign ? `+${text}` : text;
}

/** Plain value for a money input: 1284.55, -84.27. */
export function centsToInput(cents: Cents | null | undefined): string {
  if (cents == null) return '';
  const abs = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * Parses typed money into cents without floating point. Accepts "$1,234.5", "−45.20", "12".
 * Returns null when the text is not an amount.
 */
export function parseMoney(text: string | null | undefined): Cents | null {
  if (text == null) return null;
  const cleaned = text.trim().replace(/[$,\s]/g, '').replace(MINUS, '-');
  const match = /^(-)?(\d*)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match || (!match[2] && !match[3])) return null;
  const cents = Number(match[2] || '0') * 100 + Number((match[3] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return match[1] && cents !== 0 ? -cents : cents;
}

/** Oct 3 */
export function formatDay(date: IsoDate): string {
  const { month, day } = parseIso(date);
  return `${MONTHS[month - 1]!.slice(0, 3)} ${day}`;
}

/** Oct 7, 2026 */
export function formatDate(date: IsoDate): string {
  return `${formatDay(date)}, ${parseIso(date).year}`;
}

/** Wednesday, October 7, 2026 */
export function formatLongDate(date: IsoDate): string {
  const { year, month, day } = parseIso(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${MONTHS[month - 1]} ${day}, ${year}`;
}

/** October 2026 */
export function formatPeriod(period: Period): string {
  const { year, month } = parsePeriod(period);
  return `${MONTHS[month - 1]} ${year}`;
}

/** October */
export function monthName(period: Period): string {
  return MONTHS[parsePeriod(period).month - 1]!;
}

/** Sep 2028 */
export function formatMonthYear(period: Period): string {
  const { year, month } = parsePeriod(period);
  return `${MONTHS[month - 1]!.slice(0, 3)} ${year}`;
}

export function formatAccount(account: { institution: string; last4: string }): string {
  return `${account.institution} ••${account.last4}`;
}

export function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}
