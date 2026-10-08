import { createApp } from './app.ts';
import { createClock } from './clock.ts';
import { ConfigError, loadConfig } from './config.ts';
import { connectDb, disconnectDb } from './db.ts';

async function main() {
  const config = loadConfig();
  await connectDb(config.mongodbUri);
  const app = createApp({ clock: createClock(config.timeZone, config.fixedToday) });
  const server = app.listen(config.port, () => console.log(`Home Close API listening on :${config.port}`));

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => void disconnectDb().then(() => process.exit(0)));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
});
