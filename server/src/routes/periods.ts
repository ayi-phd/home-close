import { Router } from 'express';
import * as periods from '../controllers/periods.ts';

export const periodsRouter = Router()
  .get('/:period', periods.get)
  .get('/:period/items', periods.listItems)
  .put('/:period/items/:billId/statement', periods.saveStatement)
  .put('/:period/items/:billId/schedule', periods.schedule)
  .put('/:period/items/:billId/payment', periods.pay)
  .post('/:period/close', periods.close)
  .post('/:period/reopen', periods.reopen);
