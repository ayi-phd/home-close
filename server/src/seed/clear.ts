/**
 * npm run db:clear [-- --keep-household]: deletes all documents from the app's collections in
 * MONGODB_URI. Collections, indexes and the database itself are kept. --keep-household also keeps
 * the household records, so the app still opens with an empty household.
 */
import { ConfigError, loadConfig } from '../config.ts';
import { connectDb, disconnectDb } from '../db.ts';
import { clearDatabase } from './seed.ts';

const FLAGS = ['--keep-household'];

try {
  const args = process.argv.slice(2);
  const unknown = args.filter((a) => !FLAGS.includes(a));
  if (unknown.length > 0) throw new Error(`Unknown option ${unknown.join(', ')}. Usage: npm run db:clear [-- --keep-household]`);
  const keepHousehold = args.includes('--keep-household');

  const config = loadConfig();
  if (config.nodeEnv === 'production') throw new Error('Refusing to clear a production database.');
  await connectDb(config.mongodbUri, { syncIndexes: false });
  const deleted = await clearDatabase({ keepHousehold });
  for (const [collection, count] of Object.entries(deleted)) console.log(`${collection}: ${count} deleted`);
  if (keepHousehold) console.log('households: kept');
  console.log(
    keepHousehold
      ? 'Done. Collections and indexes were kept; the household is empty.'
      : 'Done. Collections and indexes were kept. Run npm run seed to load the sample household.',
  );
  await disconnectDb();
} catch (error) {
  console.error(error instanceof ConfigError ? error.message : error instanceof Error ? error.message : error);
  process.exit(1);
}
