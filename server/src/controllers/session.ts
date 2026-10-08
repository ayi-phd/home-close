import type { Request, Response } from 'express';
import { sessionOf } from '../middleware/session.ts';
import { parseSignupInput } from '../routes/schemas.ts';
import * as sessions from '../services/session.ts';
import { clockOf } from './context.ts';

export async function get(req: Request, res: Response) {
  res.json(await sessions.getSession(sessionOf(res), clockOf(req)()));
}

/** v0: sign-in is UI-only, so any credentials return the stub session. */
export async function login(req: Request, res: Response) {
  res.status(201).json(await sessions.getSession(sessionOf(res), clockOf(req)()));
}

export async function logout(_req: Request, res: Response) {
  res.status(204).end();
}

export async function signup(req: Request, res: Response) {
  res.status(201).json(await sessions.signup(sessionOf(res), parseSignupInput(req.body), clockOf(req)()));
}
