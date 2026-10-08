import type { Request, Response } from 'express';
import type { Clock } from '../clock.ts';
import { sessionOf } from '../middleware/session.ts';
import type { Ctx } from '../services/context.ts';

export function clockOf(req: Request): Clock {
  return req.app.locals.clock as Clock;
}

/** Household scope always comes from the session, never from the request body or query. */
export function ctxOf(req: Request, res: Response): Ctx {
  const session = sessionOf(res);
  return { householdId: session.householdId, userName: session.userName, today: clockOf(req)() };
}

/** Express 5 types params as string | string[]; our routes only use single segments. */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
