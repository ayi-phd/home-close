import type { IsoDate } from './types.ts';

export type Clock = () => IsoDate;

/** Today's date in `timeZone`, or the pinned date when one is configured. */
export function createClock(timeZone: string, fixedToday: IsoDate | null): Clock {
  if (fixedToday) return () => fixedToday;
  const format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return () => format.format(new Date());
}
