/** Converts stored documents (lean) into the API's wire shapes. */
import type { Types } from 'mongoose';
import type { Account, Bill, CloseItem, Reconciliation, Transaction } from '../types.ts';
import { bookBalance, clearedBalance, summarize } from './domain/reconciliation.ts';

type Id = { _id: Types.ObjectId };
const str = (id: Types.ObjectId | null | undefined) => (id ? id.toString() : null);

export interface StoredAccount extends Id {
  name: string;
  institution: string;
  type: 'checking' | 'savings';
  last4: string;
  openingBalance: number;
  openingDate: string;
  role?: string | null;
  color: string;
}

export interface StoredBill extends Id {
  name: string;
  category: Bill['category'];
  lines: string[];
  frequency: Bill['frequency'];
  cycleAnchorMonth?: number | null;
  statementDay?: number | null;
  dueRule: { kind: 'fixed-day' | 'days-after-statement'; day?: number | null; days?: number | null };
  amountType: Bill['amountType'];
  typicalAmount: number;
  accountId: Types.ObjectId;
  autopay?: boolean | null;
  reference?: string | null;
  defaultPayment?: Bill['defaultPayment'];
  loan?: { balance?: number | null; paymentsLeft?: number | null; aprBps?: number | null } | null;
  color: string;
  initials: string;
}

export interface StoredItem extends Omit<CloseItem, 'billId' | 'accountId' | 'transactionId' | 'next'> {
  billId: Types.ObjectId;
  accountId: Types.ObjectId;
  transactionId?: Types.ObjectId | null;
}

export interface StoredTransaction extends Omit<Transaction, 'id' | 'accountId' | 'billId'>, Id {
  accountId: Types.ObjectId;
  billId?: Types.ObjectId | null;
}

export interface StoredReconciliation extends Omit<Reconciliation, 'accountId' | 'summary'> {
  accountId: Types.ObjectId;
}

export function toBill(b: StoredBill): Bill {
  return {
    id: b._id.toString(),
    name: b.name,
    category: b.category,
    lines: [...b.lines],
    frequency: b.frequency,
    cycleAnchorMonth: b.cycleAnchorMonth ?? null,
    statementDay: b.statementDay ?? null,
    dueRule: b.dueRule.kind === 'fixed-day' ? { kind: 'fixed-day', day: b.dueRule.day ?? 1 } : { kind: 'days-after-statement', days: b.dueRule.days ?? 1 },
    amountType: b.amountType,
    typicalAmount: b.typicalAmount,
    accountId: b.accountId.toString(),
    autopay: !!b.autopay,
    reference: b.reference ?? '',
    defaultPayment: b.defaultPayment ?? null,
    loan: b.loan ? { balance: b.loan.balance ?? 0, paymentsLeft: b.loan.paymentsLeft ?? 0, aprBps: b.loan.aprBps ?? null } : null,
    color: b.color,
    initials: b.initials,
  };
}

export function toTransaction(t: StoredTransaction): Transaction {
  return {
    id: t._id.toString(),
    accountId: t.accountId.toString(),
    date: t.date,
    description: t.description,
    category: t.category,
    kind: t.kind,
    amount: t.amount,
    cleared: !!t.cleared,
    billId: str(t.billId),
    billPeriod: t.billPeriod ?? null,
  };
}

export function toItem(i: StoredItem): CloseItem {
  return {
    billId: i.billId.toString(),
    period: i.period,
    status: i.status,
    statementDate: i.statementDate ?? null,
    dueDate: i.dueDate ?? null,
    amount: i.amount,
    estimated: !!i.estimated,
    lines: i.lines.map((l) => ({ name: l.name, amount: l.amount })),
    servicePeriod: i.servicePeriod?.start && i.servicePeriod.end ? { start: i.servicePeriod.start, end: i.servicePeriod.end } : null,
    minimumDue: i.minimumDue ?? null,
    accountId: i.accountId.toString(),
    scheduledDate: i.scheduledDate ?? null,
    paidDate: i.paidDate ?? null,
    paidAmount: i.paidAmount ?? null,
    method: i.method ?? null,
    confirmation: i.confirmation ?? null,
    transactionId: str(i.transactionId),
    signedOff: !!i.signedOff,
    next: null,
  };
}

export function toAccount(a: StoredAccount, txs: Transaction[], recs: StoredReconciliation[]): Account {
  const id = a._id.toString();
  const mine = txs.filter((t) => t.accountId === id);
  const signed = recs
    .filter((r) => r.accountId.toString() === id && r.status === 'signed-off' && r.asOf)
    .map((r) => r.asOf!)
    .sort();
  const balanceAccount = { id, openingBalance: a.openingBalance };
  return {
    id,
    name: a.name,
    institution: a.institution,
    type: a.type,
    last4: a.last4,
    openingBalance: a.openingBalance,
    openingDate: a.openingDate,
    role: a.role ?? '',
    color: a.color,
    balances: {
      book: bookBalance(balanceAccount, mine),
      cleared: clearedBalance(balanceAccount, mine),
      unclearedCount: mine.filter((t) => !t.cleared).length,
    },
    lastReconciled: signed.at(-1) ?? null,
  };
}

export function toReconciliation(rec: StoredReconciliation, account: StoredAccount, txs: Transaction[]): Reconciliation {
  const accountId = account._id.toString();
  return {
    accountId,
    period: rec.period,
    bankBalance: rec.bankBalance ?? null,
    asOf: rec.asOf ?? null,
    status: rec.status,
    signedOffAt: rec.signedOffAt ?? null,
    signedOffBy: rec.signedOffBy ?? null,
    summary: summarize({ id: accountId, openingBalance: account.openingBalance }, txs, rec.period, rec.bankBalance ?? null),
  };
}
