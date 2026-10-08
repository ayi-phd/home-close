import express from 'express';
import mongoose from 'mongoose';
import type { Clock } from './clock.ts';
import { errorHandler, notFoundHandler } from './middleware/errors.ts';
import { requireSession, type ResolveSession } from './middleware/session.ts';
import { accountsRouter } from './routes/accounts.ts';
import { billsRouter } from './routes/bills.ts';
import { periodsRouter } from './routes/periods.ts';
import { reconciliationsRouter } from './routes/reconciliations.ts';
import { sessionRouter } from './routes/session.ts';
import { transactionsRouter } from './routes/transactions.ts';

export interface AppOptions {
  clock: Clock;
  resolveSession?: ResolveSession;
}

export function createApp({ clock, resolveSession }: AppOptions) {
  const app = express();
  app.locals.clock = clock;
  app.disable('x-powered-by');
  app.set('query parser', 'simple');

  // Liveness/readiness for containers: 200 only while MongoDB is connected.
  app.get('/healthz', (_req, res) => {
    const up = mongoose.connection.readyState === mongoose.ConnectionStates.connected;
    res.status(up ? 200 : 503).json({ status: up ? 'ok' : 'unavailable' });
  });

  const api = express.Router();
  api.use(express.json({ limit: '100kb' }));
  api.use(requireSession(resolveSession));
  api.use(sessionRouter);
  api.use('/accounts', accountsRouter);
  api.use('/bills', billsRouter);
  api.use('/periods', periodsRouter);
  api.use('/transactions', transactionsRouter);
  api.use('/reconciliations', reconciliationsRouter);
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
