import { describe, expect, it } from 'vitest';
import { createFixtures } from '../../seed/fixtures.ts';
import { bookBalance, canSignOff, clearedBalance, summarize } from './reconciliation.ts';

const { accounts, transactions } = createFixtures();
const chase = accounts.find((a) => a.id === 'chk')!;

describe('reconciliation', () => {
  it('computes book and cleared balances in cents', () => {
    expect(bookBalance(chase, transactions)).toBe(642018 + 385000 - 150000 - 7999 - 61240 - 8427 - 5210 - 21345);
    expect(clearedBalance(chase, transactions)).toBe(807779);
  });

  it('difference = bank − (opening + cleared)', () => {
    const summary = summarize(chase, transactions, '2026-10', 799352);
    expect(summary).toMatchObject({
      openingBalance: 642018,
      clearedDeposits: 385000,
      clearedWithdrawals: -(150000 + 7999 + 61240),
      clearedBalance: 807779,
      unclearedCount: 3,
      unclearedTotal: -(8427 + 5210 + 21345),
      difference: -8427,
    });
    expect(canSignOff(summary)).toBe(false);
  });

  it('balances once the missing item clears', () => {
    const cleared = transactions.map((t) => (t.id === 't5' ? { ...t, cleared: true } : t));
    const summary = summarize(chase, cleared, '2026-10', 799352);
    expect(summary.difference).toBe(0);
    expect(canSignOff(summary)).toBe(true);
  });

  it('has no difference until a bank balance is entered', () => {
    const summary = summarize(chase, transactions, '2026-10', null);
    expect(summary.difference).toBeNull();
    expect(canSignOff(summary)).toBe(false);
  });

  it('rolls earlier cleared activity into the opening balance', () => {
    expect(summarize(chase, transactions, '2026-11', null).openingBalance).toBe(807779);
  });
});
