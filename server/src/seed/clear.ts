/**
 * npm run db:clear: deletes all documents from the app's collections in MONGODB_URI.
 * Collections, indexes and the database itself are kept.
 */
import { ConfigError, loadConfig } from '../config.ts';
import { connectDb, disconnectDb } from '../db.ts';
import { clearDatabase } from './seed.ts';

try {
  const config = loadConfig();
  if (config.nodeEnv === 'production') throw new Error('Refusing to clear a production database.');
  await connectDb(config.mongodbUri, { syncIndexes: false });
  const deleted = await clearDatabase();
  for (const [collection, count] of Object.entries(deleted)) console.log(`${collection}: ${count} deleted`);
  console.log('Done. Collections and indexes were kept. Run npm run seed to load the sample household.');
  await disconnectDb();
} catch (error) {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
}
