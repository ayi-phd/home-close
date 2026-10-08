import type { Types } from 'mongoose';
import type { IsoDate } from '../types.ts';

/** Who is asking and when: built per request from the session and the clock. */
export interface Ctx {
  householdId: Types.ObjectId;
  /** Display name recorded on sign-offs and closed periods. */
  userName: string;
  today: IsoDate;
}
