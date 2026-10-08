import type { Request, Response } from 'express';
import { parsePeriod } from '../middleware/validation.ts';
import { parsePaymentInput, parseStatementInput } from '../routes/schemas.ts';
import * as periods from '../services/periods.ts';
import { ctxOf, param } from './context.ts';

const periodParam = (req: Request) => parsePeriod(param(req, 'period'));

export async function get(req: Request, res: Response) {
  res.json(await periods.getPeriod(ctxOf(req, res), periodParam(req)));
}

export async function listItems(req: Request, res: Response) {
  res.json((await periods.getPeriod(ctxOf(req, res), periodParam(req))).items);
}

export async function saveStatement(req: Request, res: Response) {
  res.json(await periods.saveStatement(ctxOf(req, res), periodParam(req), param(req, 'billId'), parseStatementInput(req.body)));
}

export async function schedule(req: Request, res: Response) {
  res.json(await periods.schedulePayment(ctxOf(req, res), periodParam(req), param(req, 'billId'), parsePaymentInput(req.body)));
}

export async function pay(req: Request, res: Response) {
  res.json(await periods.recordPayment(ctxOf(req, res), periodParam(req), param(req, 'billId'), parsePaymentInput(req.body)));
}

export async function close(req: Request, res: Response) {
  res.json(await periods.closePeriod(ctxOf(req, res), periodParam(req)));
}

export async function reopen(req: Request, res: Response) {
  res.json(await periods.reopenPeriod(ctxOf(req, res), periodParam(req)));
}
