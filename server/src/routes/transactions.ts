import { Router } from 'express';
import * as transactions from '../controllers/transactions.ts';

export const transactionsRouter = Router().get('/', transactions.list).post('/', transactions.create).patch('/:id', transactions.patch);
