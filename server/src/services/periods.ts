/** Monthly close: checklist per period, statement/schedule/payment transitions, lock and reopen. */
import { Types } from 'mongoose';
import { conflict, notFound, validationError } from '../errors.ts';
import { CloseItemModel } from '../models/closeItem.ts';
import { ClosePeriodModel } from '../models/closePeriod.ts';
import { TransactionModel } from '../models/transaction.ts';
import type { CloseItem, ClosePeriod, PaymentInput, Period, StatementInput } from '../types.ts';
import { findBill } from './bills.ts';
import type { Ctx } from './context.ts';
import { applyPayment, applySchedule, applyStatement, buildItems, computeProgress, generateItem } from './domain/close.ts';
import { toBill, toItem, toReconciliation, type StoredBill, type StoredItem, type StoredTransaction } from './mappers.ts';
import {
  ensureActivityEditable,
  ensurePeriodOpen,
  findAccount,
  loadAccounts,
  loadBills,
  loadReconciliations,
  loadTransactions,
} from './store.ts';

export async function getPeriod(ctx: Ctx, period: Period): Promise<ClosePeriod> {
  const [record, bills, stored, accounts, txs, recs] = await Promise.all([
    ClosePeriodModel.findOne({ householdId: ctx.householdId, period }).lean(),
    loadBills(ctx),
    CloseItemModel.find({ householdId: ctx.householdId, period }).lean<StoredItem[]>(),
    loadAccounts(ctx),
    loadTransactions(ctx),
    loadReconciliations(ctx, { period }),
  ]);
  const items = buildItems(bills.map(toBill), period, stored.map(toItem));
  const reconciliations = accounts.map((a) => {
    const rec = recs.find((r) => r.accountId.equals(a._id)) ?? {
      accountId: a._id, period, bankBalance: null, asOf: null, status: 'open' as const, signedOffAt: null, signedOffBy: null,
    };
    return toReconciliation(rec, a, txs);
  });
  return {
    period,
    status: record?.status === 'closed' ? 'closed' : 'open',
    closedAt: record?.closedAt ?? null,
    closedBy: record?.closedBy ?? null,
    items,
    progress: computeProgress(items, reconciliations),
  };
}

async function openItem(ctx: Ctx, period: Period, billId: string): Promise<{ bill: StoredBill; item: CloseItem }> {
  const bill = await findBill(ctx, billId);
  if (!bill) throw notFound('Bill');
  await ensurePeriodOpen(ctx, period);
  const stored = await CloseItemModel.findOne({ householdId: ctx.householdId, period, billId: bill._id }).lean<StoredItem>();
  const item = stored ? toItem(stored) : generateItem(toBill(bill), period);
  if (item.status === 'offcycle') throw conflict('off_cycle', `${bill.name} is not billed in this period.`);
  return { bill, item };
}

async function saveItem(ctx: Ctx, item: CloseItem): Promise<CloseItem> {
  const { next: _next, billId, accountId, transactionId, ...fields } = item;
  const key = { householdId: ctx.householdId, period: item.period, billId: new Types.ObjectId(billId) };
  await CloseItemModel.updateOne(
    key,
    { $set: { ...fields, accountId: new Types.ObjectId(accountId), transactionId: transactionId ? new Types.ObjectId(transactionId) : null } },
    { upsert: true, runValidators: true },
  );
  return toItem((await CloseItemModel.findOne(key).lean<StoredItem>())!);
}

async function requirePaymentAccount(ctx: Ctx, accountId: string) {
  const account = await findAccount(ctx, accountId);
  if (!account) throw validationError({ accountId: 'Choose an account.' });
  return account;
}

export async function saveStatement(ctx: Ctx, period: Period, billId: string, input: StatementInput): Promise<CloseItem> {
  const { item } = await openItem(ctx, period, billId);
  return saveItem(ctx, applyStatement(item, input));
}

export async function schedulePayment(ctx: Ctx, period: Period, billId: string, input: PaymentInput): Promise<CloseItem> {
  const { item } = await openItem(ctx, period, billId);
  await requirePaymentAccount(ctx, input.accountId);
  if (item.status === 'paid') throw conflict('already_paid', 'This bill is already paid.');
  return saveItem(ctx, applySchedule(item, input));
}

/**
 * Marks the bill paid and records the payment in the paying account. Re-recording updates the
 * same transaction. (Not atomic: v0's standalone MongoDB has no multi-document transactions.)
 */
export async function recordPayment(ctx: Ctx, period: Period, billId: string, input: PaymentInput): Promise<CloseItem> {
  const { bill, item } = await openItem(ctx, period, billId);
  const account = await requirePaymentAccount(ctx, input.accountId);
  await ensureActivityEditable(ctx, account._id, input.date);
  const existing = item.transactionId
    ? await TransactionModel.findOne({ _id: item.transactionId, householdId: ctx.householdId }).lean<StoredTransaction>()
    : null;
  const fields = {
    householdId: ctx.householdId,
    accountId: account._id,
    date: input.date,
    description: `${bill.name} — payment`,
    category: 'Bill payment',
    kind: 'bill-payment' as const,
    amount: -input.amount,
    billId: bill._id,
    billPeriod: period,
  };
  let transactionId: Types.ObjectId;
  if (existing) {
    await TransactionModel.updateOne({ _id: existing._id }, { $set: fields });
    transactionId = existing._id;
  } else {
    transactionId = (await TransactionModel.create({ ...fields, cleared: false }))._id;
  }
  return saveItem(ctx, applyPayment(item, input, transactionId.toString()));
}

export async function closePeriod(ctx: Ctx, period: Period): Promise<ClosePeriod> {
  await ensurePeriodOpen(ctx, period);
  if (!(await getPeriod(ctx, period)).progress.canLock) {
    throw conflict('close_incomplete', 'Pay every bill and reconcile every account before locking the period.');
  }
  await ClosePeriodModel.updateOne(
    { householdId: ctx.householdId, period },
    { $set: { status: 'closed', closedAt: ctx.today, closedBy: ctx.userName } },
    { upsert: true },
  );
  return getPeriod(ctx, period);
}

export async function reopenPeriod(ctx: Ctx, period: Period): Promise<ClosePeriod> {
  await ClosePeriodModel.deleteOne({ householdId: ctx.householdId, period });
  return getPeriod(ctx, period);
}
