import { notFound, validationError } from '../errors.ts';
import { TransactionModel } from '../models/transaction.ts';
import type { NewTransactionInput, Period, Transaction } from '@home-close/shared';
import type { Ctx } from './context.ts';
import { periodEnd, periodStart } from './domain/dates.ts';
import { toTransaction, type StoredTransaction } from './mappers.ts';
import { ensureActivityEditable, findAccount, objectId } from './store.ts';

export interface TransactionQuery {
  accountId?: string;
  period?: Period;
}

/** Newest first. */
export async function listTransactions(ctx: Ctx, query: TransactionQuery): Promise<Transaction[]> {
  const filter: Record<string, unknown> = { householdId: ctx.householdId };
  if (query.accountId) {
    const account = await findAccount(ctx, query.accountId);
    if (!account) return [];
    filter.accountId = account._id;
  }
  if (query.period) filter.date = { $gte: periodStart(query.period), $lte: periodEnd(query.period) };
  const docs = await TransactionModel.find(filter).sort({ date: -1, _id: -1 }).lean<StoredTransaction[]>();
  return docs.map(toTransaction);
}

/** Creates an expense or deposit, or both sides of a transfer. */
export async function createTransaction(ctx: Ctx, input: NewTransactionInput): Promise<Transaction[]> {
  const from = await findAccount(ctx, input.accountId);
  const to = input.kind === 'transfer' ? await findAccount(ctx, input.toAccountId) : null;
  const fields: Record<string, string> = {};
  if (!from) fields.accountId = 'Choose an account.';
  if (input.kind === 'transfer' && !to) fields.toAccountId = 'Choose an account.';
  if (Object.keys(fields).length > 0) throw validationError(fields);

  await ensureActivityEditable(ctx, from!._id, input.date);
  const base = { householdId: ctx.householdId, date: input.date, cleared: false, billId: null, billPeriod: null };
  let docs;
  if (input.kind === 'transfer') {
    await ensureActivityEditable(ctx, to!._id, input.date);
    const shared = { ...base, category: 'Transfer', kind: 'transfer' as const };
    docs = await TransactionModel.create([
      { ...shared, accountId: from!._id, amount: -input.amount, description: input.description.trim() || `Transfer to ${to!.institution} ••${to!.last4}` },
      { ...shared, accountId: to!._id, amount: input.amount, description: input.description.trim() || `Transfer from ${from!.institution} ••${from!.last4}` },
    ]);
  } else {
    docs = await TransactionModel.create([
      {
        ...base,
        accountId: from!._id,
        description: input.description.trim(),
        category: input.category,
        kind: input.kind,
        amount: input.kind === 'expense' ? -input.amount : input.amount,
      },
    ]);
  }
  return docs.map((d) => toTransaction(d.toObject() as StoredTransaction));
}

export async function setCleared(ctx: Ctx, id: string, cleared: boolean): Promise<Transaction> {
  const _id = objectId(id, 'Transaction');
  const tx = await TransactionModel.findOne({ _id, householdId: ctx.householdId }).lean<StoredTransaction>();
  if (!tx) throw notFound('Transaction');
  await ensureActivityEditable(ctx, tx.accountId, tx.date);
  await TransactionModel.updateOne({ _id }, { $set: { cleared } });
  return toTransaction({ ...tx, cleared });
}
