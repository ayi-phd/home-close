import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { useTestApi } from '../test/api.ts';
import { clearDatabase } from './seed.ts';

useTestApi();

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
});
