import { Router } from 'express';
import * as accounts from '../controllers/accounts.ts';

export const accountsRouter = Router().get('/', accounts.list).post('/', accounts.create).get('/:id', accounts.get).put('/:id', accounts.update);
