import { Router } from 'express';
import * as bills from '../controllers/bills.ts';

export const billsRouter = Router().get('/', bills.list).post('/', bills.create).get('/:id', bills.get).put('/:id', bills.update);
