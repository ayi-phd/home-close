import type { Request, Response } from 'express';
import { parseBillInput } from '../routes/schemas.ts';
import * as bills from '../services/bills.ts';
import { ctxOf, param } from './context.ts';

export async function list(req: Request, res: Response) {
  res.json(await bills.listBills(ctxOf(req, res)));
}

export async function get(req: Request, res: Response) {
  res.json(await bills.getBill(ctxOf(req, res), param(req, 'id')));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await bills.createBill(ctxOf(req, res), parseBillInput(req.body)));
}

export async function update(req: Request, res: Response) {
  res.json(await bills.updateBill(ctxOf(req, res), param(req, 'id'), parseBillInput(req.body)));
}
