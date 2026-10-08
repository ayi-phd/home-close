/**
 * Monthly close: builds a period's checklist from the bills and applies status transitions
 * (awaiting statement → entered → scheduled → paid).
 */
import type {
  Bill,
  CloseItem,
  CloseProgress,
  PaymentInput,
  Period,
  Reconciliation,
  StatementInput,
} from '../types.ts';
import { cycleDueIn, nextCycleAfter } from './cycles.ts';

export const STATUS_ORDER = ['awaiting', 'entered', 'scheduled', 'paid'] as const;

export function sumLines(lines: { amount: number }[]): number {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}

function blankItem(bill: Bill, period: Period): CloseItem {
  return {
    billId: bill.id,
    period,
    status: 'awaiting',
    statementDate: null,
    dueDate: null,
    amount: 0,
    estimated: false,
    lines: [],
    servicePeriod: null,
    minimumDue: null,
    accountId: bill.accountId,
    scheduledDate: null,
    paidDate: null,
    paidAmount: null,
    method: null,
    confirmation: null,
    transactionId: null,
    signedOff: false,
    next: null,
  };
}

/** A fresh item for a bill due in `period`, before anything has been entered. */
export function generateItem(bill: Bill, period: Period): CloseItem {
  const cycle = cycleDueIn(bill, period);
  const item = blankItem(bill, period);
  if (!cycle) {
    const next = nextCycleAfter(bill, period);
    return { ...item, status: 'offcycle', next: next && { statementDate: next.statementDate, dueDate: next.dueDate } };
  }
  const single = bill.lines.length === 1;
  const lines = bill.lines.map((name) => ({ name, amount: single ? bill.typicalAmount : 0 }));
  const base = {
    ...item,
    statementDate: cycle.statementDate,
    dueDate: cycle.dueDate,
    amount: bill.typicalAmount,
    lines,
  };
  // Bills without statements and on autopay (e.g. a fixed loan payment) are already scheduled.
  if (cycle.statementDate == null && bill.autopay) {
    return { ...base, status: 'scheduled', scheduledDate: cycle.dueDate, method: 'autopay' };
  }
  return { ...base, estimated: bill.amountType !== 'fixed' || cycle.statementDate != null };
}

/** Checklist for a period: stored items win; every other bill gets a generated one. */
export function buildItems(bills: Bill[], period: Period, stored: CloseItem[]): CloseItem[] {
  const byBill = new Map(stored.filter((i) => i.period === period).map((i) => [i.billId, i]));
  return bills
    .map((bill) => byBill.get(bill.id) ?? generateItem(bill, period))
    .sort(compareItems);
}

function compareItems(a: CloseItem, b: CloseItem): number {
  if (a.status === 'offcycle' !== (b.status === 'offcycle')) return a.status === 'offcycle' ? 1 : -1;
  return (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
}

export function computeProgress(items: CloseItem[], reconciliations: Reconciliation[]): CloseProgress {
  const live = items.filter((i) => i.status !== 'offcycle');
  const byStatus = { awaiting: 0, entered: 0, scheduled: 0, paid: 0 };
  for (const item of live) byStatus[item.status as keyof typeof byStatus]++;
  const totalDue = live.reduce((sum, i) => sum + i.amount, 0);
  const paid = live.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const reconciledCount = reconciliations.filter((r) => r.status === 'signed-off').length;
  const tasks = live.length + reconciliations.length;
  const tasksDone = byStatus.paid + reconciledCount;
  return {
    billCount: live.length,
    offCycleCount: items.length - live.length,
    estimatedCount: live.filter((i) => i.estimated).length,
    byStatus,
    accountCount: reconciliations.length,
    reconciledCount,
    tasks,
    tasksDone,
    totalDue,
    paid,
    remaining: totalDue - paid,
    canLock: tasks > 0 && tasksDone === tasks,
  };
}

/** Entering a statement moves an awaiting item to entered; later stages keep their status. */
export function applyStatement(item: CloseItem, input: StatementInput): CloseItem {
  return {
    ...item,
    statementDate: input.statementDate,
    dueDate: input.dueDate,
    lines: input.lines,
    amount: sumLines(input.lines),
    estimated: false,
    servicePeriod: input.servicePeriod,
    minimumDue: input.minimumDue,
    status: item.status === 'awaiting' ? 'entered' : item.status,
  };
}

export function applySchedule(item: CloseItem, input: PaymentInput): CloseItem {
  return {
    ...item,
    status: 'scheduled',
    accountId: input.accountId,
    scheduledDate: input.date,
    method: input.method,
    confirmation: input.confirmation,
  };
}

export function applyPayment(item: CloseItem, input: PaymentInput, transactionId: string): CloseItem {
  return {
    ...item,
    status: 'paid',
    estimated: false,
    accountId: input.accountId,
    paidDate: input.date,
    paidAmount: input.amount,
    method: input.method,
    confirmation: input.confirmation,
    transactionId,
    signedOff: true,
  };
}
