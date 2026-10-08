/** Replaces all data with the sample household. Fixture keys ('chk', 't3', 'ladwp') become ObjectIds. */
import { Types } from 'mongoose';
import { AccountModel } from '../models/account.ts';
import { BillModel } from '../models/bill.ts';
import { CloseItemModel } from '../models/closeItem.ts';
import { ClosePeriodModel } from '../models/closePeriod.ts';
import { Household } from '../models/household.ts';
import { ReconciliationModel } from '../models/reconciliation.ts';
import { TransactionModel } from '../models/transaction.ts';
import { createSampleData, type SampleData } from '@home-close/shared';

const MODELS = [Household, AccountModel, BillModel, CloseItemModel, ClosePeriodModel, TransactionModel, ReconciliationModel];

export async function clearDatabase() {
  await Promise.all(MODELS.map((m) => m.collection.deleteMany({})));
}

export interface SeedResult {
  householdId: Types.ObjectId;
  /** Fixture key → ObjectId string, for tests. */
  ids: Record<string, string>;
}

export async function seedDatabase(data: SampleData = createSampleData()): Promise<SeedResult> {
  await clearDatabase();
  const ids = new Map<string, Types.ObjectId>();
  const id = (key: string) => {
    if (!ids.has(key)) ids.set(key, new Types.ObjectId());
    return ids.get(key)!;
  };
  const ref = (key: string | null) => (key ? id(key) : null);

  // Spread creation times so "first created" ordering matches the fixture order.
  const base = Date.UTC(2026, 8, 1);
  const stamp = (i: number) => ({ createdAt: new Date(base + i * 1000), updatedAt: new Date(base + i * 1000) });

  const { user, household: info } = data.session;
  const household = await Household.create({ name: info.name, startPeriod: info.startPeriod, user });
  const householdId = household._id;
  const owned = { householdId };

  await AccountModel.insertMany(data.accounts.map(({ id: key, ...a }, i) => ({ ...a, ...owned, ...stamp(i), _id: id(key) })), { timestamps: false });
  await BillModel.insertMany(data.bills.map(({ id: key, accountId, ...b }, i) => ({ ...b, ...owned, ...stamp(i), _id: id(key), accountId: id(accountId) })), { timestamps: false });
  await TransactionModel.insertMany(
    data.transactions.map(({ id: key, accountId, billId, ...t }) => ({ ...t, ...owned, _id: id(key), accountId: id(accountId), billId: ref(billId) })),
  );
  await CloseItemModel.insertMany(
    data.items.map(({ next: _next, billId, accountId, transactionId, ...item }) => ({
      ...item,
      ...owned,
      billId: id(billId),
      accountId: id(accountId),
      transactionId: ref(transactionId),
    })),
  );
  await ClosePeriodModel.insertMany(data.periods.map((p) => ({ ...p, ...owned })));
  await ReconciliationModel.insertMany(data.reconciliations.map(({ accountId, ...r }) => ({ ...r, ...owned, accountId: id(accountId) })));

  return { householdId, ids: Object.fromEntries([...ids].map(([k, v]) => [k, v.toString()])) };
}
