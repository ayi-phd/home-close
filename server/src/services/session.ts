/** Session endpoints for v0: sign-in and sign-up are UI-only and act on the stub household. */
import { Household } from '../models/household.ts';
import type { IsoDate, Session, SignupInput } from '../types.ts';
import { periodOf } from './domain/dates.ts';
import type { SessionInfo } from '../middleware/session.ts';
import { unauthenticated } from '../errors.ts';

export async function getSession(session: SessionInfo, today: IsoDate): Promise<Session> {
  const household = await Household.findById(session.householdId).lean();
  if (!household?.user) throw unauthenticated();
  return {
    user: { firstName: household.user.firstName, lastName: household.user.lastName, email: household.user.email },
    household: { name: household.name, startPeriod: household.startPeriod },
    today,
    currentPeriod: periodOf(today),
  };
}

/** Any input "creates" the household in v0: non-empty fields update the stub household. */
export async function signup(session: SessionInfo, input: Partial<SignupInput>, today: IsoDate): Promise<Session> {
  const set: Record<string, string> = {};
  if (input.firstName) set['user.firstName'] = input.firstName;
  if (input.lastName) set['user.lastName'] = input.lastName;
  if (input.email) set['user.email'] = input.email;
  if (input.householdName) set.name = input.householdName;
  if (input.startPeriod) set.startPeriod = input.startPeriod;
  if (Object.keys(set).length > 0) await Household.updateOne({ _id: session.householdId }, { $set: set }, { runValidators: true });
  return getSession(session, today);
}
