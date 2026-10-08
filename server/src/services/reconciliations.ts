/** Reconciliation: bank balance entry, sign-off at a $0.00 difference, reopen. */
import { conflict } from '../errors.ts';
import { ReconciliationModel } from '../models/reconciliation.ts';
import type { Cents, IsoDate, Period, Reconciliation } from '@home-close/shared';
import type { Ctx } from './context.ts';
import { canSignOff } from './domain/reconciliation.ts';
import { toReconciliation, type StoredAccount, type StoredReconciliation } from './mappers.ts';
import { ensurePeriodOpen, loadAccounts, loadReconciliations, loadTransactions, requireAccount, storedReconciliation } from './store.ts';

async function view(ctx: Ctx, account: StoredAccount, rec: StoredReconciliation): Promise<Reconciliation> {
  return toReconciliation(rec, account, await loadTransactions(ctx));
}

async function save(ctx: Ctx, rec: StoredReconciliation) {
  const { accountId, period, ...fields } = rec;
  await ReconciliationModel.updateOne({ householdId: ctx.householdId, accountId, period }, { $set: fields }, { upsert: true, runValidators: true });
}

export async function listReconciliations(ctx: Ctx, period: Period): Promise<Reconciliation[]> {
  const [accounts, recs, txs] = await Promise.all([loadAccounts(ctx), loadReconciliations(ctx, { period }), loadTransactions(ctx)]);
  return accounts.map((a) => {
    const rec = recs.find((r) => r.accountId.equals(a._id)) ?? {
      accountId: a._id, period, bankBalance: null, asOf: null, status: 'open' as const, signedOffAt: null, signedOffBy: null,
    };
    return toReconciliation(rec, a, txs);
  });
}

export async function getReconciliation(ctx: Ctx, accountId: string, period: Period): Promise<Reconciliation> {
  const account = await requireAccount(ctx, accountId);
  return view(ctx, account, await storedReconciliation(ctx, account._id, period));
}

export async function updateReconciliation(
  ctx: Ctx,
  accountId: string,
  period: Period,
  input: { bankBalance: Cents | null; asOf: IsoDate | null },
): Promise<Reconciliation> {
  const account = await requireAccount(ctx, accountId);
  await ensurePeriodOpen(ctx, period);
  const rec = await storedReconciliation(ctx, account._id, period);
  if (rec.status === 'signed-off') throw conflict('reconciliation_signed_off', 'Reopen the reconciliation to change it.');
  const updated = { ...rec, bankBalance: input.bankBalance, asOf: input.asOf };
  await save(ctx, updated);
  return view(ctx, account, updated);
}

export async function signOff(ctx: Ctx, accountId: string, period: Period): Promise<Reconciliation> {
  const account = await requireAccount(ctx, accountId);
  await ensurePeriodOpen(ctx, period);
  const rec = await storedReconciliation(ctx, account._id, period);
  if (!canSignOff((await view(ctx, account, rec)).summary)) {
    throw conflict('not_balanced', 'The difference must be $0.00 before you can sign off.');
  }
  const updated: StoredReconciliation = { ...rec, status: 'signed-off', asOf: rec.asOf ?? ctx.today, signedOffAt: ctx.today, signedOffBy: ctx.userName };
  await save(ctx, updated);
  return view(ctx, account, updated);
}

export async function reopen(ctx: Ctx, accountId: string, period: Period): Promise<Reconciliation> {
  const account = await requireAccount(ctx, accountId);
  await ensurePeriodOpen(ctx, period);
  const updated: StoredReconciliation = { ...(await storedReconciliation(ctx, account._id, period)), status: 'open', signedOffAt: null, signedOffBy: null };
  await save(ctx, updated);
  return view(ctx, account, updated);
}
