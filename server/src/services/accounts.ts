import { AccountModel } from '../models/account.ts';
import type { Account, AccountInput } from '@home-close/shared';
import type { Ctx } from './context.ts';
import { toAccount, type StoredAccount } from './mappers.ts';
import { loadAccounts, loadReconciliations, loadTransactions, requireAccount } from './store.ts';

const ACCOUNT_COLORS = ['#2F6F5E', '#8A4B08', '#3D5A80', '#7A3E65'];

async function withBalances(ctx: Ctx, accounts: StoredAccount[]): Promise<Account[]> {
  const [txs, recs] = await Promise.all([loadTransactions(ctx), loadReconciliations(ctx)]);
  return accounts.map((a) => toAccount(a, txs, recs));
}

export async function listAccounts(ctx: Ctx): Promise<Account[]> {
  return withBalances(ctx, await loadAccounts(ctx));
}

export async function getAccount(ctx: Ctx, id: string): Promise<Account> {
  const [account] = await withBalances(ctx, [await requireAccount(ctx, id)]);
  return account!;
}

export async function createAccount(ctx: Ctx, input: AccountInput): Promise<Account> {
  const count = await AccountModel.countDocuments({ householdId: ctx.householdId });
  const doc = await AccountModel.create({
    ...input,
    householdId: ctx.householdId,
    role: input.type === 'savings' ? 'Savings' : 'Checking',
    color: ACCOUNT_COLORS[count % ACCOUNT_COLORS.length],
  });
  return getAccount(ctx, doc._id.toString());
}

export async function updateAccount(ctx: Ctx, id: string, input: AccountInput): Promise<Account> {
  const account = await requireAccount(ctx, id);
  await AccountModel.updateOne({ _id: account._id, householdId: ctx.householdId }, { $set: input });
  return getAccount(ctx, id);
}
