import type { Request, Response } from 'express';
import { parseClearedPatch, parseTransactionInput, parseTransactionQuery } from '../routes/schemas.ts';
import * as transactions from '../services/transactions.ts';
import { ctxOf, param } from './context.ts';

export async function list(req: Request, res: Response) {
  res.json(await transactions.listTransactions(ctxOf(req, res), parseTransactionQuery(req.query)));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await transactions.createTransaction(ctxOf(req, res), parseTransactionInput(req.body)));
}

export async function patch(req: Request, res: Response) {
  const { cleared } = parseClearedPatch(req.body);
  res.json(await transactions.setCleared(ctxOf(req, res), param(req, 'id'), cleared));
}
