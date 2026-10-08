/** Household-scoped reads and guards shared by the resource services. */
import { Types } from 'mongoose';
import { conflict, notFound } from '../errors.ts';
import { AccountModel } from '../models/account.ts';
import { BillModel } from '../models/bill.ts';
import { ClosePeriodModel } from '../models/closePeriod.ts';
import { ReconciliationModel } from '../models/reconciliation.ts';
import { TransactionModel } from '../models/transaction.ts';
import type { IsoDate, Period, Transaction } from '../types.ts';
import type { Ctx } from './context.ts';
import { periodOf } from './domain/dates.ts';
import { toTransaction, type StoredAccount, type StoredBill, type StoredReconciliation, type StoredTransaction } from './mappers.ts';

/** Parses a path id; anything malformed is simply "not found". */
export function objectId(id: string, what: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id) || !/^[0-9a-f]{24}$/i.test(id)) throw notFound(what);
  return new Types.ObjectId(id);
}

export function loadAccounts(ctx: Ctx) {
  return AccountModel.find({ householdId: ctx.householdId }).sort({ createdAt: 1, _id: 1 }).lean<StoredAccount[]>();
}

export async function findAccount(ctx: Ctx, id: string): Promise<StoredAccount | null> {
  if (!/^[0-9a-f]{24}$/i.test(id)) return null;
  return AccountModel.findOne({ _id: id, householdId: ctx.householdId }).lean<StoredAccount>();
}

export async function requireAccount(ctx: Ctx, id: string): Promise<StoredAccount> {
  const account = await findAccount(ctx, id);
  if (!account) throw notFound('Account');
  return account;
}

export function loadBills(ctx: Ctx) {
  return BillModel.find({ householdId: ctx.householdId }).sort({ createdAt: 1, _id: 1 }).lean<StoredBill[]>();
}

export async function loadTransactions(ctx: Ctx): Promise<Transaction[]> {
  const docs = await TransactionModel.find({ householdId: ctx.householdId }).lean<StoredTransaction[]>();
  return docs.map(toTransaction);
}

export function loadReconciliations(ctx: Ctx, filter: { period?: Period } = {}) {
  return ReconciliationModel.find({ householdId: ctx.householdId, ...filter }).lean<StoredReconciliation[]>();
}

export async function storedReconciliation(ctx: Ctx, accountId: Types.ObjectId, period: Period): Promise<StoredReconciliation> {
  const rec = await ReconciliationModel.findOne({ householdId: ctx.householdId, accountId, period }).lean<StoredReconciliation>();
  return rec ?? { accountId, period, bankBalance: null, asOf: null, status: 'open', signedOffAt: null, signedOffBy: null };
}

export async function isClosed(ctx: Ctx, period: Period): Promise<boolean> {
  return !!(await ClosePeriodModel.exists({ householdId: ctx.householdId, period, status: 'closed' }));
}

export async function ensurePeriodOpen(ctx: Ctx, period: Period) {
  if (await isClosed(ctx, period)) throw conflict('period_closed', 'This period is closed. Reopen it to make changes.');
}

/** Activity in a closed period, or in a signed-off reconciliation, is read-only. */
export async function ensureActivityEditable(ctx: Ctx, accountId: Types.ObjectId, date: IsoDate) {
  const period = periodOf(date);
  await ensurePeriodOpen(ctx, period);
  if ((await storedReconciliation(ctx, accountId, period)).status === 'signed-off') {
    throw conflict('reconciliation_signed_off', 'This account is signed off for the period. Reopen the reconciliation first.');
  }
}
