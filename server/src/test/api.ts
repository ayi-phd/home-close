/** API test harness: a fresh database per test file on the shared in-memory MongoDB, re-seeded before each test. */
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, inject } from 'vitest';
import { createApp } from '../app.ts';
import { connectDb, disconnectDb } from '../db.ts';
import { seedDatabase, type SeedResult } from '../seed/seed.ts';

export const TODAY = '2026-10-07';

export function useTestApi() {
  const state = { ids: {} as Record<string, string>, seed: null as SeedResult | null };
  const app = createApp({ clock: () => TODAY });

  beforeAll(async () => {
    const uri = new URL(inject('mongoUri'));
    uri.pathname = `/homeclose_test_${randomUUID().slice(0, 8)}`;
    await connectDb(uri.toString());
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });
  beforeEach(async () => {
    state.seed = await seedDatabase();
    state.ids = state.seed.ids;
  });

  return {
    api: () => request(app),
    /** ObjectId string for a fixture key such as 'chk' or 'ladwp'. */
    id: (key: string) => {
      const value = state.ids[key];
      if (!value) throw new Error(`Unknown fixture key ${key}`);
      return value;
    },
    seed: () => state.seed!,
  };
}
