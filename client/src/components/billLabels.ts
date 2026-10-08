import type { Bill, BillCategory, DueRule, Frequency } from '../api/types';

export const CATEGORIES: BillCategory[] = ['utilities', 'internet-mobile', 'credit-card', 'loan'];

export const CATEGORY_LABEL: Record<BillCategory, string> = {
  utilities: 'Utilities',
  'internet-mobile': 'Internet & mobile',
  'credit-card': 'Credit cards',
  loan: 'Installment loans',
};

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  monthly: 'Monthly',
  bimonthly: 'Every 2 months',
  quarterly: 'Quarterly',
};

/** Service lines offered as toggle chips per category (utilities and telecom only). */
export const SERVICE_OPTIONS: Record<BillCategory, string[]> = {
  utilities: ['Electricity', 'Water', 'Gas', 'Trash pickup', 'Sewer', 'Recycling'],
  'internet-mobile': ['Internet', 'Mobile', 'TV', 'Home phone'],
  'credit-card': [],
  loan: [],
};

export const CYCLE_OPTIONS: Record<Exclude<Frequency, 'monthly'>, { value: number; label: string }[]> = {
  bimonthly: [
    { value: 1, label: 'Odd months (Jan, Mar, May…)' },
    { value: 2, label: 'Even months (Feb, Apr, Jun…)' },
  ],
  quarterly: [
    { value: 1, label: 'Jan, Apr, Jul, Oct' },
    { value: 2, label: 'Feb, May, Aug, Nov' },
    { value: 3, label: 'Mar, Jun, Sep, Dec' },
  ],
};

export function cycleLabel(bill: Pick<Bill, 'frequency' | 'cycleAnchorMonth'>): string | null {
  if (bill.frequency === 'monthly') return null;
  const anchor = bill.cycleAnchorMonth ?? 1;
  const options = CYCLE_OPTIONS[bill.frequency];
  return options.find((o) => o.value === ((anchor - 1) % options.length) + 1)?.label ?? null;
}

/** "21 days after statement", "Day 3 of next month", "Day 15". */
export function dueRuleLabel(rule: DueRule, statementDay: number | null): string {
  if (rule.kind === 'days-after-statement') return `${rule.days} days after statement`;
  return statementDay != null && rule.day <= statementDay ? `Day ${rule.day} of next month` : `Day ${rule.day}`;
}
