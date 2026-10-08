import { describe, expect, it } from 'vitest';
import { createSampleData } from '../sample.ts';
import type { Reconciliation } from '../types.ts';
import { applyPayment, applySchedule, applyStatement, buildItems, computeProgress, generateItem } from './close.ts';

const { bills, items } = createSampleData();
const bill = (id: string) => bills.find((b) => b.id === id)!;

const rec = (status: Reconciliation['status']): Reconciliation => ({
  accountId: 'a', period: '2026-10', bankBalance: 0, asOf: null, status, signedOffAt: null, signedOffBy: null,
  summary: { openingBalance: 0, clearedDeposits: 0, clearedWithdrawals: 0, clearedBalance: 0, unclearedCount: 0, unclearedTotal: 0, bookBalance: 0, difference: 0 },
});

describe('generateItem', () => {
  it('estimates an awaiting item from the typical amount', () => {
    const item = generateItem(bill('amex'), '2026-11');
    expect(item).toMatchObject({ status: 'awaiting', statementDate: '2026-10-09', dueDate: '2026-11-04', amount: 60000, estimated: true });
  });

  it('schedules autopay bills that have no statement', () => {
    expect(generateItem(bill('toyota'), '2026-11')).toMatchObject({ status: 'scheduled', scheduledDate: '2026-11-15', method: 'autopay', estimated: false });
  });

  it('marks off-cycle months and says when the bill is next due', () => {
    expect(generateItem(bill('ladwp'), '2026-11')).toMatchObject({
      status: 'offcycle',
      next: { statementDate: '2026-11-28', dueDate: '2026-12-19' },
    });
  });

  it('splits nothing for multi-line bills until the statement arrives', () => {
    expect(generateItem(bill('ladwp'), '2026-12').lines.map((l) => l.amount)).toEqual([0, 0, 0]);
  });
});

describe('buildItems', () => {
  it('prefers stored items and sorts by due date with off-cycle last', () => {
    const october = buildItems(bills, '2026-10', items);
    expect(october.map((i) => i.billId)).toEqual(['spectrum', 'amex', 'verizon', 'toyota', 'ladwp', 'sapphire', 'socal']);
    const september = buildItems(bills, '2026-09', items);
    expect(september.at(-1)).toMatchObject({ billId: 'ladwp', status: 'offcycle' });
  });
});

describe('computeProgress', () => {
  it('totals due, paid and remaining and counts tasks', () => {
    const october = buildItems(bills, '2026-10', items);
    const progress = computeProgress(october, [rec('open'), rec('signed-off')]);
    expect(progress).toMatchObject({
      billCount: 7,
      byStatus: { awaiting: 1, entered: 2, scheduled: 2, paid: 2 },
      totalDue: 7999 + 61240 + 14218 + 41236 + 28673 + 128455 + 4100,
      paid: 7999 + 61240,
      tasks: 9,
      tasksDone: 3,
      estimatedCount: 1,
      canLock: false,
    });
    expect(progress.remaining).toBe(progress.totalDue - progress.paid);
  });

  it('can lock once every bill is paid and every account is signed off', () => {
    const september = buildItems(bills, '2026-09', items);
    expect(computeProgress(september, [rec('signed-off')]).canLock).toBe(true);
  });
});

describe('status transitions', () => {
  const awaiting = generateItem(bill('socal'), '2026-11');
  const input = { date: '2026-11-20', accountId: 'chk', amount: 3890, method: 'website' as const, confirmation: null };

  it('entering a statement sums the lines and moves awaiting → entered', () => {
    const entered = applyStatement(awaiting, {
      statementDate: '2026-11-09', dueDate: '2026-11-28', servicePeriod: null, minimumDue: null,
      lines: [{ name: 'Gas', amount: 3800 }, { name: 'Tax', amount: 90 }],
    });
    expect(entered).toMatchObject({ status: 'entered', amount: 3890, estimated: false });
  });

  it('keeps a later status when a statement is corrected', () => {
    const scheduled = applySchedule(awaiting, input);
    expect(applyStatement(scheduled, { statementDate: null, dueDate: '2026-11-28', lines: [{ name: 'Gas', amount: 1 }], servicePeriod: null, minimumDue: null }).status).toBe('scheduled');
  });

  it('records a payment with its transaction and sign-off', () => {
    expect(applyPayment(awaiting, input, 't9')).toMatchObject({ status: 'paid', paidDate: '2026-11-20', paidAmount: 3890, transactionId: 't9', signedOff: true });
  });
});
