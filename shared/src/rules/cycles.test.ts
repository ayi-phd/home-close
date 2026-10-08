import { describe, expect, it } from 'vitest';
import type { Bill } from '../types.ts';
import { cycleDueIn, dueAfterStatement, isBillingMonth, nextCycleAfter } from './cycles.ts';

type CycleBill = Pick<Bill, 'frequency' | 'cycleAnchorMonth' | 'statementDay' | 'dueRule'>;

const ladwp: CycleBill = { frequency: 'bimonthly', cycleAnchorMonth: 1, statementDay: 28, dueRule: { kind: 'days-after-statement', days: 21 } };
const spectrum: CycleBill = { frequency: 'monthly', cycleAnchorMonth: null, statementDay: 18, dueRule: { kind: 'fixed-day', day: 3 } };
const toyota: CycleBill = { frequency: 'monthly', cycleAnchorMonth: null, statementDay: null, dueRule: { kind: 'fixed-day', day: 15 } };

describe('isBillingMonth', () => {
  it('bills monthly bills every month', () => {
    expect(isBillingMonth(spectrum, '2026-02')).toBe(true);
  });

  it('bills odd-month bimonthly bills in Jan, Mar … Nov', () => {
    expect(isBillingMonth(ladwp, '2026-09')).toBe(true);
    expect(isBillingMonth(ladwp, '2026-10')).toBe(false);
    expect(isBillingMonth({ ...ladwp, cycleAnchorMonth: 2 }, '2026-10')).toBe(true);
  });

  it('bills quarterly bills every third month from the anchor', () => {
    const q: CycleBill = { ...spectrum, frequency: 'quarterly', cycleAnchorMonth: 2 };
    expect(['2026-02', '2026-05', '2026-08', '2026-11'].every((p) => isBillingMonth(q, p))).toBe(true);
    expect(isBillingMonth(q, '2026-03')).toBe(false);
  });
});

describe('dueAfterStatement', () => {
  it('adds N days to the statement date', () => {
    expect(dueAfterStatement({ kind: 'days-after-statement', days: 21 }, '2026-09-28')).toBe('2026-10-19');
  });

  it('uses the next occurrence of a fixed day', () => {
    expect(dueAfterStatement({ kind: 'fixed-day', day: 3 }, '2026-09-18')).toBe('2026-10-03');
    expect(dueAfterStatement({ kind: 'fixed-day', day: 23 }, '2026-09-09')).toBe('2026-09-23');
  });

  it('clamps a fixed day to short months', () => {
    expect(dueAfterStatement({ kind: 'fixed-day', day: 31 }, '2027-02-05')).toBe('2027-02-28');
  });
});

describe('cycleDueIn', () => {
  it('finds the statement whose due date lands in the period', () => {
    expect(cycleDueIn(spectrum, '2026-10')).toEqual({ billingPeriod: '2026-09', statementDate: '2026-09-18', dueDate: '2026-10-03' });
    expect(cycleDueIn(ladwp, '2026-10')).toEqual({ billingPeriod: '2026-09', statementDate: '2026-09-28', dueDate: '2026-10-19' });
  });

  it('returns null for an off-cycle month', () => {
    expect(cycleDueIn(ladwp, '2026-09')).toBeNull();
    expect(cycleDueIn(ladwp, '2026-11')).toBeNull();
  });

  it('handles bills without statements', () => {
    expect(cycleDueIn(toyota, '2026-11')).toEqual({ billingPeriod: '2026-11', statementDate: null, dueDate: '2026-11-15' });
  });

  it('clamps a statement day of 31 to the month length', () => {
    const late: CycleBill = { ...spectrum, statementDay: 31, dueRule: { kind: 'days-after-statement', days: 10 } };
    expect(cycleDueIn(late, '2027-03')?.statementDate).toBe('2027-02-28');
  });
});

describe('nextCycleAfter', () => {
  it('explains when an off-cycle bill is next due', () => {
    expect(nextCycleAfter(ladwp, '2026-11')).toMatchObject({ statementDate: '2026-11-28', dueDate: '2026-12-19' });
  });
});
