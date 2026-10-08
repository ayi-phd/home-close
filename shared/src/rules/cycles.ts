/**
 * Bill cycle rules: which months a bill is billed in, its statement date and its due date.
 * A close period contains the bills whose due date falls in that month.
 */
import type { Bill, IsoDate, Period } from '../types.ts';
import { addDays, addMonths, clampedDate, parseIso, parsePeriod, periodOf } from '../dates.ts';

type CycleBill = Pick<Bill, 'frequency' | 'cycleAnchorMonth' | 'statementDay' | 'dueRule'>;

export interface Cycle {
  /** Month the statement is issued (or, for bills without statements, the month it is due). */
  billingPeriod: Period;
  statementDate: IsoDate | null;
  dueDate: IsoDate;
}

const INTERVAL = { monthly: 1, bimonthly: 2, quarterly: 3 } as const;

export function isBillingMonth(bill: CycleBill, period: Period): boolean {
  const interval = INTERVAL[bill.frequency];
  if (interval === 1) return true;
  const anchor = bill.cycleAnchorMonth ?? 1;
  const { month } = parsePeriod(period);
  return (((month - anchor) % interval) + interval) % interval === 0;
}

export function cycleFor(bill: CycleBill, billingPeriod: Period): Cycle {
  const { year, month } = parsePeriod(billingPeriod);
  if (bill.statementDay == null) {
    const day = bill.dueRule.kind === 'fixed-day' ? bill.dueRule.day : 1;
    return { billingPeriod, statementDate: null, dueDate: clampedDate(year, month, day) };
  }
  const statementDate = clampedDate(year, month, bill.statementDay);
  return { billingPeriod, statementDate, dueDate: dueAfterStatement(bill.dueRule, statementDate) };
}

/** Due date for a statement: N days later, or the next occurrence of a fixed day after it. */
export function dueAfterStatement(rule: Bill['dueRule'], statementDate: IsoDate): IsoDate {
  if (rule.kind === 'days-after-statement') return addDays(statementDate, rule.days);
  const { year, month, day } = parseIso(statementDate);
  const sameMonth = clampedDate(year, month, rule.day);
  if (parseIso(sameMonth).day > day) return sameMonth;
  const next = parsePeriod(addMonths(periodOf(statementDate), 1));
  return clampedDate(next.year, next.month, rule.day);
}

/** The cycle whose due date falls in `period`, or null when the bill is off-cycle that month. */
export function cycleDueIn(bill: CycleBill, period: Period): Cycle | null {
  // A due date can trail its statement by up to ~2 months, so look back that far.
  for (let back = 2; back >= 0; back--) {
    const billingPeriod = addMonths(period, -back);
    if (!isBillingMonth(bill, billingPeriod)) continue;
    const cycle = cycleFor(bill, billingPeriod);
    if (periodOf(cycle.dueDate) === period) return cycle;
  }
  return null;
}

/** First cycle due after `period`, used to explain off-cycle months. */
export function nextCycleAfter(bill: CycleBill, period: Period): Cycle | null {
  for (let ahead = 1; ahead <= 12; ahead++) {
    const cycle = cycleDueIn(bill, addMonths(period, ahead));
    if (cycle) return cycle;
  }
  return null;
}
