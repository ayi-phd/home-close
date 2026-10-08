import type { Request, Response } from 'express';
import { parsePeriod } from '../middleware/validation.ts';
import { parseReconciliationUpdate } from '../routes/schemas.ts';
import * as reconciliations from '../services/reconciliations.ts';
import { ctxOf, param } from './context.ts';

const key = (req: Request) => ({ accountId: param(req, 'accountId'), period: parsePeriod(param(req, 'period')) });

export async function list(req: Request, res: Response) {
  res.json(await reconciliations.listReconciliations(ctxOf(req, res), parsePeriod(req.query.period)));
}

export async function get(req: Request, res: Response) {
  const { accountId, period } = key(req);
  res.json(await reconciliations.getReconciliation(ctxOf(req, res), accountId, period));
}

export async function update(req: Request, res: Response) {
  const { accountId, period } = key(req);
  res.json(await reconciliations.updateReconciliation(ctxOf(req, res), accountId, period, parseReconciliationUpdate(req.body)));
}

export async function signOff(req: Request, res: Response) {
  const { accountId, period } = key(req);
  res.json(await reconciliations.signOff(ctxOf(req, res), accountId, period));
}

export async function reopen(req: Request, res: Response) {
  const { accountId, period } = key(req);
  res.json(await reconciliations.reopen(ctxOf(req, res), accountId, period));
}
