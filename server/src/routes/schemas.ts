/**
 * Request body/query parsers. Each one validates untrusted JSON at the route boundary and returns
 * a typed input, or throws a 400 with every field error at once.
 */
import type {
  AccountInput,
  BillInput,
  DueRule,
  NewTransactionInput,
  PaymentInput,
  SignupInput,
  StatementInput,
} from '../types.ts';
import { isIsoDate, isPeriod } from '../services/domain/dates.ts';
import {
  asObject,
  FieldErrors,
  isCents,
  isIntInRange,
  isNonEmpty,
  isNonNegativeCents,
  isObjectId,
  isOptionalDate,
  isPositiveCents,
  isString,
  oneOf,
  type Body,
} from '../middleware/validation.ts';

const CATEGORIES = ['utilities', 'internet-mobile', 'credit-card', 'loan'] as const;
const FREQUENCIES = ['monthly', 'bimonthly', 'quarterly'] as const;
const METHODS = ['website', 'autopay', 'bill-pay', 'check'] as const;
const trim = (v: unknown) => (isString(v) ? v.trim() : '');

export function parseAccountInput(raw: unknown): AccountInput {
  const b = asObject(raw);
  const e = new FieldErrors();
  e.check(isNonEmpty(b.name), 'name', 'Enter a nickname.');
  e.check(isNonEmpty(b.institution), 'institution', 'Enter the bank.');
  e.check(oneOf(['checking', 'savings'], b.type), 'type', 'Choose checking or savings.');
  e.check(isString(b.last4) && /^\d{4}$/.test(b.last4), 'last4', 'Enter the last 4 digits.');
  e.check(isCents(b.openingBalance), 'openingBalance', 'Enter the opening balance.');
  e.check(isIsoDate(b.openingDate), 'openingDate', 'Enter a valid date.');
  e.throwIfAny();
  return {
    name: trim(b.name),
    institution: trim(b.institution),
    type: b.type as AccountInput['type'],
    last4: b.last4 as string,
    openingBalance: b.openingBalance as number,
    openingDate: b.openingDate as string,
  };
}

function parseDueRule(raw: unknown, statementDay: unknown, e: FieldErrors): DueRule {
  const rule = (typeof raw === 'object' && raw !== null ? raw : {}) as Body;
  if (rule.kind === 'fixed-day') {
    e.check(isIntInRange(rule.day, 1, 31), 'dueRule', 'Enter a due day from 1 to 31.');
    return { kind: 'fixed-day', day: rule.day as number };
  }
  if (rule.kind === 'days-after-statement') {
    e.check(isIntInRange(rule.days, 1, 90), 'dueRule', 'Enter 1 to 90 days.');
    e.check(statementDay != null, 'dueRule', 'A due date after the statement needs a statement day.');
    return { kind: 'days-after-statement', days: rule.days as number };
  }
  e.add('dueRule', 'Choose a due rule.');
  return { kind: 'fixed-day', day: 1 };
}

export function parseBillInput(raw: unknown): BillInput {
  const b = asObject(raw);
  const e = new FieldErrors();
  e.check(isNonEmpty(b.name), 'name', 'Enter the biller name.');
  e.check(oneOf(CATEGORIES, b.category), 'category', 'Choose a type.');
  const lines = Array.isArray(b.lines) ? b.lines : [];
  e.check(lines.length > 0 && lines.every(isNonEmpty), 'lines', 'Pick at least one service.');
  e.check(oneOf(FREQUENCIES, b.frequency), 'frequency', 'Choose how often.');
  if (b.frequency !== 'monthly') e.check(isIntInRange(b.cycleAnchorMonth, 1, 12), 'cycleAnchorMonth', 'Choose which months it is billed in.');
  const statementDay = b.statementDay ?? null;
  if (statementDay === null) e.check(b.category === 'loan', 'statementDay', 'Enter a statement day from 1 to 31.');
  else e.check(isIntInRange(statementDay, 1, 31), 'statementDay', 'Enter a statement day from 1 to 31.');
  const dueRule = parseDueRule(b.dueRule, statementDay, e);
  e.check(oneOf(['fixed', 'varies'], b.amountType), 'amountType', 'Choose fixed or varies.');
  e.check(isNonNegativeCents(b.typicalAmount), 'typicalAmount', 'Enter an amount of $0.00 or more.');
  e.check(isObjectId(b.accountId), 'accountId', 'Choose an account.');
  e.check(typeof b.autopay === 'boolean', 'autopay', 'Say whether autopay is on.');
  const reference = b.reference ?? '';
  e.check(isString(reference) && /^\d{0,4}$/.test(reference), 'reference', 'Use up to 4 digits.');
  const defaultPayment = b.defaultPayment ?? null;
  e.check(defaultPayment === null || oneOf(['statement', 'minimum', 'fixed'], defaultPayment), 'defaultPayment', 'Choose a default payment.');
  let loan: BillInput['loan'] = null;
  if (b.loan != null) {
    const l = asObject(b.loan);
    e.check(isNonNegativeCents(l.balance), 'loan.balance', 'Enter the current balance.');
    e.check(isIntInRange(l.paymentsLeft, 0, 1200), 'loan.paymentsLeft', 'Enter the payments left.');
    const aprBps = l.aprBps ?? null;
    e.check(aprBps === null || isIntInRange(aprBps, 0, 10000), 'loan.aprBps', 'Enter an APR from 0 to 100%.');
    loan = { balance: l.balance as number, paymentsLeft: l.paymentsLeft as number, aprBps: aprBps as number | null };
  }
  e.throwIfAny();
  return {
    name: trim(b.name),
    category: b.category as BillInput['category'],
    lines: (lines as string[]).map((l) => l.trim()),
    frequency: b.frequency as BillInput['frequency'],
    cycleAnchorMonth: (b.cycleAnchorMonth as number | undefined) ?? null,
    statementDay: statementDay as number | null,
    dueRule,
    amountType: b.amountType as BillInput['amountType'],
    typicalAmount: b.typicalAmount as number,
    accountId: b.accountId as string,
    autopay: b.autopay as boolean,
    reference: reference as string,
    defaultPayment: defaultPayment as BillInput['defaultPayment'],
    loan,
  };
}

export function parseStatementInput(raw: unknown): StatementInput {
  const b = asObject(raw);
  const e = new FieldErrors();
  const statementDate = b.statementDate ?? null;
  e.check(isOptionalDate(statementDate), 'statementDate', 'Enter a valid date.');
  e.check(isIsoDate(b.dueDate), 'dueDate', 'Enter a valid due date.');
  const lines = Array.isArray(b.lines) ? b.lines : [];
  e.check(lines.length > 0, 'lines', 'Enter at least one amount.');
  const parsedLines = lines.map((raw, i) => {
    const line = (typeof raw === 'object' && raw !== null ? raw : {}) as Body;
    e.check(isNonEmpty(line.name), `lines.${i}`, 'Name this line.');
    e.check(isNonNegativeCents(line.amount), `lines.${i}`, 'Enter an amount of $0.00 or more.');
    return { name: trim(line.name), amount: line.amount as number };
  });
  let servicePeriod: StatementInput['servicePeriod'] = null;
  if (b.servicePeriod != null) {
    const sp = asObject(b.servicePeriod);
    const ok = isIsoDate(sp.start) && isIsoDate(sp.end) && sp.start <= sp.end;
    e.check(ok, 'servicePeriod', 'Enter a start date on or before the end date.');
    servicePeriod = { start: sp.start as string, end: sp.end as string };
  }
  const minimumDue = b.minimumDue ?? null;
  e.check(minimumDue === null || isNonNegativeCents(minimumDue), 'minimumDue', 'Enter an amount of $0.00 or more.');
  e.throwIfAny();
  return { statementDate: statementDate as string | null, dueDate: b.dueDate as string, lines: parsedLines, servicePeriod, minimumDue: minimumDue as number | null };
}

export function parsePaymentInput(raw: unknown): PaymentInput {
  const b = asObject(raw);
  const e = new FieldErrors();
  e.check(isIsoDate(b.date), 'date', 'Enter a valid payment date.');
  e.check(isObjectId(b.accountId), 'accountId', 'Choose an account.');
  e.check(isPositiveCents(b.amount), 'amount', 'Enter an amount greater than $0.00.');
  e.check(oneOf(METHODS, b.method), 'method', 'Choose a payment method.');
  const confirmation = b.confirmation ?? null;
  e.check(confirmation === null || isString(confirmation), 'confirmation', 'Enter text.');
  e.throwIfAny();
  return {
    date: b.date as string,
    accountId: b.accountId as string,
    amount: b.amount as number,
    method: b.method as PaymentInput['method'],
    confirmation: confirmation ? (confirmation as string).trim() || null : null,
  };
}

export function parseTransactionInput(raw: unknown): NewTransactionInput {
  const b = asObject(raw);
  const e = new FieldErrors();
  e.check(oneOf(['expense', 'deposit', 'transfer'], b.kind), 'kind', 'Choose a type.');
  e.check(isIsoDate(b.date), 'date', 'Enter a valid date.');
  e.check(isObjectId(b.accountId), 'accountId', 'Choose an account.');
  e.check(isPositiveCents(b.amount), 'amount', 'Enter an amount greater than $0.00.');
  if (b.kind === 'transfer') {
    e.check(isObjectId(b.toAccountId), 'toAccountId', 'Choose an account.');
    e.check(b.toAccountId !== b.accountId, 'toAccountId', 'Choose a different account.');
  } else {
    e.check(isNonEmpty(b.description), 'description', 'Enter a description.');
    e.check(isNonEmpty(b.category), 'category', 'Choose a category.');
  }
  e.throwIfAny();
  const base = { date: b.date as string, description: trim(b.description), accountId: b.accountId as string, amount: b.amount as number };
  if (b.kind === 'transfer') return { ...base, kind: 'transfer', toAccountId: b.toAccountId as string };
  return { ...base, kind: b.kind as 'expense' | 'deposit', category: trim(b.category) };
}

export function parseClearedPatch(raw: unknown): { cleared: boolean } {
  const b = asObject(raw);
  const e = new FieldErrors();
  e.check(typeof b.cleared === 'boolean', 'cleared', 'Send cleared as true or false.');
  e.throwIfAny();
  return { cleared: b.cleared as boolean };
}

export function parseReconciliationUpdate(raw: unknown): { bankBalance: number | null; asOf: string | null } {
  const b = asObject(raw);
  const e = new FieldErrors();
  const bankBalance = b.bankBalance ?? null;
  const asOf = b.asOf ?? null;
  e.check(bankBalance === null || isCents(bankBalance), 'bankBalance', 'Enter the bank balance.');
  e.check(isOptionalDate(asOf), 'asOf', 'Enter a valid date.');
  e.throwIfAny();
  return { bankBalance: bankBalance as number | null, asOf: asOf as string | null };
}

/** v0 sign-up is UI-only: anything goes; only well-formed, non-empty values are applied. */
export function parseSignupInput(raw: unknown): Partial<SignupInput> {
  const b = typeof raw === 'object' && raw !== null ? (raw as Body) : {};
  const pick = (v: unknown) => (isNonEmpty(v) ? v.trim() : undefined);
  return {
    firstName: pick(b.firstName),
    lastName: pick(b.lastName),
    householdName: pick(b.householdName),
    email: pick(b.email),
    startPeriod: isPeriod(b.startPeriod) ? b.startPeriod : undefined,
  };
}

export function parseTransactionQuery(query: Record<string, unknown>): { accountId?: string; period?: string } {
  const e = new FieldErrors();
  const { accountId, period } = query;
  e.check(accountId === undefined || isString(accountId), 'accountId', 'Send one account id.');
  e.check(period === undefined || isPeriod(period), 'period', 'Use the YYYY-MM format.');
  e.throwIfAny();
  return { accountId: accountId as string | undefined, period: period as string | undefined };
}
