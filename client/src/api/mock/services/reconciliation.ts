/**
 * Account reconciliation: difference = bank balance − (opening balance + cleared transactions).
 * Sign-off is allowed only when the difference is exactly 0.
 */
import type { Account, Cents, Period, ReconciliationSummary, Transaction } from '../../types';
import { periodEnd, periodStart } from '../../dates';

type Tx = Pick<Transaction, 'accountId' | 'date' | 'amount' | 'cleared'>;

const sum = (txs: Tx[]) => txs.reduce((total, t) => total + t.amount, 0);

export function bookBalance(account: Pick<Account, 'id' | 'openingBalance'>, txs: Tx[]): Cents {
  return account.openingBalance + sum(txs.filter((t) => t.accountId === account.id));
}

export function clearedBalance(account: Pick<Account, 'id' | 'openingBalance'>, txs: Tx[]): Cents {
  return account.openingBalance + sum(txs.filter((t) => t.accountId === account.id && t.cleared));
}

export function difference(bankBalance: Cents | null, cleared: Cents): Cents | null {
  return bankBalance == null ? null : bankBalance - cleared;
}

export function summarize(
  account: Pick<Account, 'id' | 'openingBalance'>,
  txs: Tx[],
  period: Period,
  bankBalance: Cents | null,
): ReconciliationSummary {
  const start = periodStart(period);
  const end = periodEnd(period);
  const mine = txs.filter((t) => t.accountId === account.id && t.date <= end);
  const before = mine.filter((t) => t.date < start && t.cleared);
  const during = mine.filter((t) => t.date >= start && t.cleared);
  const uncleared = mine.filter((t) => !t.cleared);
  const openingBalance = account.openingBalance + sum(before);
  const clearedDeposits = sum(during.filter((t) => t.amount > 0));
  const clearedWithdrawals = sum(during.filter((t) => t.amount < 0));
  const cleared = openingBalance + clearedDeposits + clearedWithdrawals;
  return {
    openingBalance,
    clearedDeposits,
    clearedWithdrawals,
    clearedBalance: cleared,
    unclearedCount: uncleared.length,
    unclearedTotal: sum(uncleared),
    bookBalance: account.openingBalance + sum(mine),
    difference: difference(bankBalance, cleared),
  };
}

export function canSignOff(summary: ReconciliationSummary): boolean {
  return summary.difference === 0;
}
