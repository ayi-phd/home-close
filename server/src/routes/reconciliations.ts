import { Router } from 'express';
import * as reconciliations from '../controllers/reconciliations.ts';

export const reconciliationsRouter = Router()
  .get('/', reconciliations.list)
  .get('/:accountId/:period', reconciliations.get)
  .put('/:accountId/:period', reconciliations.update)
  .post('/:accountId/:period/sign-off', reconciliations.signOff)
  .post('/:accountId/:period/reopen', reconciliations.reopen);
