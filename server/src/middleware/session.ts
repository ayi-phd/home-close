/**
 * Stub session for v0: every request acts as the first household in the database.
 * Real auth replaces `resolveSession` (e.g. a cookie or token lookup) and keeps the same
 * contract: on success `res.locals.session` is set; otherwise the request gets a 401.
 */
import type { NextFunction, Request, Response } from 'express';
import type { Types } from 'mongoose';
import { unauthenticated } from '../errors.ts';
import { Household } from '../models/household.ts';

export interface SessionInfo {
  householdId: Types.ObjectId;
  userName: string;
}

export type ResolveSession = (req: Request) => Promise<SessionInfo | null>;

export const stubResolveSession: ResolveSession = async () => {
  const household = await Household.findOne().sort({ createdAt: 1 }).lean();
  if (!household) return null;
  return { householdId: household._id, userName: `${household.user?.firstName ?? ""} ${household.user?.lastName ?? ""}`.trim() };
};

export function requireSession(resolve: ResolveSession = stubResolveSession) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await resolve(req);
    if (!session) throw unauthenticated();
    res.locals.session = session;
    next();
  };
}

export function sessionOf(res: Response): SessionInfo {
  const session = res.locals.session as SessionInfo | undefined;
  if (!session) throw unauthenticated();
  return session;
}
