import mongoose from 'mongoose';

export async function connectDb(uri: string) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  // Build declared indexes (unique period/item/reconciliation keys) before serving traffic.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

export function disconnectDb() {
  return mongoose.disconnect();
}
