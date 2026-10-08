import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { useTestApi } from '../test/api.ts';
import { clearDatabase } from './seed.ts';

const { api } = useTestApi();

async function snapshot() {
  const db = mongoose.connection.db!;
  const names = (await db.listCollections().toArray()).map((c) => c.name).sort();
  const indexes = Object.fromEntries(await Promise.all(names.map(async (n) => [n, (await db.collection(n).indexes()).map((i) => i.name).sort()] as const)));
  const counts = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await db.collection(n).countDocuments()] as const)));
  return { names, indexes, counts };
}

describe('clearDatabase', () => {
  it('deletes every document but keeps collections and indexes', async () => {
    const before = await snapshot();
    expect(before.counts.transactions).toBe(9);

    const deleted = await clearDatabase();
    expect(deleted).toEqual({
      households: 1, accounts: 3, bills: 7, closeitems: 13, closeperiods: 1, transactions: 9, reconciliations: 6,
    });

    const after = await snapshot();
    expect(after.names).toEqual(before.names);
    expect(after.indexes).toEqual(before.indexes);
    expect(Object.values(after.counts).every((n) => n === 0)).toBe(true);
  });

  it('keeps household records when asked, and the API still signs in to an empty household', async () => {
    const deleted = await clearDatabase({ keepHousehold: true });
    expect(deleted).not.toHaveProperty('households');
    expect(deleted.accounts).toBe(3);

    const after = await snapshot();
    expect(after.counts.households).toBe(1);
    expect(Object.entries(after.counts).filter(([name]) => name !== 'households').every(([, n]) => n === 0)).toBe(true);

    const res = await api().get('/api/v1/accounts').expect(200);
    expect(res.body).toEqual([]);
    expect((await api().get('/api/v1/session').expect(200)).body.household.name).toBe('Rivera Household');
  });
});
