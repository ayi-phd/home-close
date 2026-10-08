import { validationError, notFound } from '../errors.ts';
import { BillModel } from '../models/bill.ts';
import type { Bill, BillInput } from '@home-close/shared';
import type { Ctx } from './context.ts';
import { toBill, type StoredBill } from './mappers.ts';
import { findAccount, loadBills } from './store.ts';

const BILL_COLORS = ['#3D5A80', '#2F6F5E', '#8A4B08', '#7A3E65'];

export async function listBills(ctx: Ctx): Promise<Bill[]> {
  return (await loadBills(ctx)).map(toBill);
}

export async function findBill(ctx: Ctx, id: string): Promise<StoredBill | null> {
  if (!/^[0-9a-f]{24}$/i.test(id)) return null;
  return BillModel.findOne({ _id: id, householdId: ctx.householdId }).lean<StoredBill>();
}

export async function getBill(ctx: Ctx, id: string): Promise<Bill> {
  const bill = await findBill(ctx, id);
  if (!bill) throw notFound('Bill');
  return toBill(bill);
}

/** Category-specific fields only apply to their category. */
function normalize(input: BillInput) {
  return {
    ...input,
    cycleAnchorMonth: input.frequency === 'monthly' ? null : input.cycleAnchorMonth,
    loan: input.category === 'loan' ? input.loan : null,
    defaultPayment: input.category === 'credit-card' ? (input.defaultPayment ?? 'statement') : null,
  };
}

async function requirePayingAccount(ctx: Ctx, accountId: string) {
  const account = await findAccount(ctx, accountId);
  if (!account) throw validationError({ accountId: 'Choose an account.' });
  return account._id;
}

export async function createBill(ctx: Ctx, input: BillInput): Promise<Bill> {
  const accountId = await requirePayingAccount(ctx, input.accountId);
  const count = await BillModel.countDocuments({ householdId: ctx.householdId });
  const doc = await BillModel.create({
    ...normalize(input),
    accountId,
    householdId: ctx.householdId,
    color: BILL_COLORS[count % BILL_COLORS.length],
    initials: input.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '?',
  });
  return getBill(ctx, doc._id.toString());
}

export async function updateBill(ctx: Ctx, id: string, input: BillInput): Promise<Bill> {
  const bill = await findBill(ctx, id);
  if (!bill) throw notFound('Bill');
  const accountId = await requirePayingAccount(ctx, input.accountId);
  await BillModel.updateOne({ _id: bill._id, householdId: ctx.householdId }, { $set: { ...normalize(input), accountId } });
  return getBill(ctx, id);
}
