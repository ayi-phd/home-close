/** npm run seed: loads the sample household into MONGODB_URI, replacing what is there. */
import { ConfigError, loadConfig } from '../config.ts';
import { connectDb, disconnectDb } from '../db.ts';
import { seedDatabase } from './seed.ts';

try {
  const config = loadConfig();
  if (config.nodeEnv === 'production') throw new Error('Refusing to seed a production database.');
  await connectDb(config.mongodbUri);
  const { ids } = await seedDatabase();
  console.log(`Seeded the sample household (${Object.keys(ids).length} records with fixture ids).`);
  await disconnectDb();
} catch (error) {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
}
