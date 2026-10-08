import mongoose from 'mongoose';

export async function connectDb(uri: string, { syncIndexes = true }: { syncIndexes?: boolean } = {}) {
  mongoose.set('strictQuery', true);
  // Data-only maintenance scripts (db:clear) skip index builds so they never touch the schema.
  mongoose.set('autoIndex', syncIndexes);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  // Build declared indexes (unique period/item/reconciliation keys) before serving traffic.
  if (syncIndexes) await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

export function disconnectDb() {
  return mongoose.disconnect();
}
