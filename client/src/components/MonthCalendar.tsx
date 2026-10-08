import type { IsoDate, Period } from '../api/types';
import { daysInMonth, parseIso, parsePeriod, periodStart, toIso, weekday } from '../api/dates';
import { formatDay } from './format';

export type CalendarMark = 'statement' | 'due' | 'paid';

const MARK_CLASS: Record<CalendarMark, string> = { statement: 'm-s', due: 'm-d', paid: 'm-p' };
const MARK_LABEL: Record<CalendarMark, string> = { statement: 'statement date', due: 'due', paid: 'paid' };
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Month grid with colored marks for statement dates, due dates and payments. */
export function MonthCalendar({ period, today, marks }: { period: Period; today: IsoDate; marks: { date: IsoDate; kind: CalendarMark }[] }) {
  const { year, month } = parsePeriod(period);
  const lead = weekday(periodStart(period));
  const days = daysInMonth(year, month);
  const byDay = new Map<number, CalendarMark[]>();
  for (const m of marks) {
    const d = parseIso(m.date);
    if (d.year !== year || d.month !== month) continue;
    byDay.set(d.day, [...(byDay.get(d.day) ?? []), m.kind]);
  }

  return (
    <>
      <div className="cal">
        {DOW.map((d, i) => (
          <div key={i} className="dow" aria-hidden="true">
            {d}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`b${i}`} className="d blank" />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const date = toIso(year, month, day);
          const kinds = byDay.get(day) ?? [];
          const state = date === today ? 'today' : date < today ? 'past' : '';
          const label = [formatDay(date), date === today && 'today', ...kinds.map((k) => MARK_LABEL[k])].filter(Boolean).join(', ');
          return (
            <div key={day} className={`d ${state}`} aria-label={label} data-testid={`cal-${date}`}>
              <span className="num" aria-hidden="true">{day}</span>
              <span className="marks" aria-hidden="true">
                {kinds.map((k, j) => (
                  <i key={j} className={MARK_CLASS[k]} />
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span><i className="m-s" />Statement date</span>
        <span><i className="m-d" />Due</span>
        <span><i className="m-p" />Paid</span>
      </div>
    </>
  );
}
