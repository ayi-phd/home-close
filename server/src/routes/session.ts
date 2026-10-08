import { Router } from 'express';
import * as session from '../controllers/session.ts';

export const sessionRouter = Router()
  .get('/session', session.get)
  .post('/session', session.login)
  .delete('/session', session.logout)
  .post('/households', session.signup);
