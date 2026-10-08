import type { Request, Response } from 'express';
import { parseAccountInput } from '../routes/schemas.ts';
import * as accounts from '../services/accounts.ts';
import { ctxOf, param } from './context.ts';

export async function list(req: Request, res: Response) {
  res.json(await accounts.listAccounts(ctxOf(req, res)));
}

export async function get(req: Request, res: Response) {
  res.json(await accounts.getAccount(ctxOf(req, res), param(req, 'id')));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await accounts.createAccount(ctxOf(req, res), parseAccountInput(req.body)));
}

export async function update(req: Request, res: Response) {
  res.json(await accounts.updateAccount(ctxOf(req, res), param(req, 'id'), parseAccountInput(req.body)));
}
