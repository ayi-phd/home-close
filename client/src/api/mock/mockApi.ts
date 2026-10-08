/**
 * In-memory implementation of the HomeCloseApi contract, backed by the prototype fixtures.
 * Business rules mirror what the Express services will enforce; the client swaps this for an
 * HTTP implementation without changing call sites.
 */
import type {
  Account,
  AccountInput,
  Bill,
  BillInput,
  CloseItem,
  ClosePeriod,
  HomeCloseApi,
  IsoDate,
  NewTransactionInput,
  PaymentInput,
  Period,
  Reconciliation,
  StatementInput,
  Transaction,
} from '../types';
import { isIsoDate, isPeriod, periodOf } from '../dates';
import { createFixtures, type MockData, type StoredAccount, type StoredReconciliation } from './fixtures';
import {
  applyPayment,
  applySchedule,
  applyStatement,
  bookBalance,
  buildItems,
  canSignOff,
  clearedBalance,
  computeProgress,
  generateItem,
  summarize,
} from '@home-close/shared';
import {
  conflict,
  FieldErrors,
  isIntInRange,
  isNonEmpty,
  isNonNegativeCents,
  isOptionalDate,
  notFound,
  oneOf,
} from './validate';

const ACCOUNT_COLORS = ['#2F6F5E', '#8A4B08', '#3D5A80', '#7A3E65'];
const BILL_COLORS = ['#3D5A80', '#2F6F5E', '#8A4B08', '#7A3E65'];
const CATEGORIES = ['utilities', 'internet-mobile', 'credit-card', 'loan'] as const;
const FREQUENCIES = ['monthly', 'bimonthly', 'quarterly'] as const;
const METHODS = ['website', 'autopay', 'bill-pay', 'check'] as const;

const clone = <T>(value: T): T => structuredClone(value);

export function createMockApi(seed: () => MockData = createFixtures) {
  let db = seed();
  let seq = 100;
  const nextId = (prefix: string) => `${prefix}${++seq}`;

  const fullName = () => `${db.session.user.firstName} ${db.session.user.lastName}`;
  const today = () => db.session.today;

  // ---------- lookups ----------

  const findAccount = (id: string) => db.accounts.find((a) => a.id === id);
  const findBill = (id: string) => db.bills.find((b) => b.id === id);
  const periodRecord = (period: Period) => db.periods.find((p) => p.period === period);
  const isClosed = (period: Period) => periodRecord(period)?.status === 'closed';

  function requirePeriod(period: string): Period {
    const e = new FieldErrors();
    e.check(isPeriod(period), 'period', 'Use the YYYY-MM format.');
    e.throwIfAny();
    return period;
  }

  function storedReconciliation(accountId: string, period: Period): StoredReconciliation {
    return (
      db.reconciliations.find((r) => r.accountId === accountId && r.period === period) ?? {
        accountId,
        period,
        bankBalance: null,
        asOf: null,
        status: 'open',
        signedOffAt: null,
        signedOffBy: null,
      }
    );
  }

  function saveReconciliation(rec: StoredReconciliation) {
    db.reconciliations = [
      ...db.reconciliations.filter((r) => !(r.accountId === rec.accountId && r.period === rec.period)),
      rec,
    ];
  }

  function toReconciliation(rec: StoredReconciliation): Reconciliation {
    const account = findAccount(rec.accountId)!;
    return { ...rec, summary: summarize(account, db.transactions, rec.period, rec.bankBalance) };
  }

  function toAccount(account: StoredAccount): Account {
    const signed = db.reconciliations
      .filter((r) => r.accountId === account.id && r.status === 'signed-off' && r.asOf)
      .map((r) => r.asOf!)
      .sort();
    const mine = db.transactions.filter((t) => t.accountId === account.id);
    return {
      ...account,
      balances: {
        book: bookBalance(account, mine),
        cleared: clearedBalance(account, mine),
        unclearedCount: mine.filter((t) => !t.cleared).length,
      },
      lastReconciled: signed.at(-1) ?? null,
    };
  }

  function periodView(period: Period): ClosePeriod {
    const record = periodRecord(period);
    const items = buildItems(db.bills, period, db.items);
    const recs = db.accounts.map((a) => toReconciliation(storedReconciliation(a.id, period)));
    return {
      period,
      status: record?.status ?? 'open',
      closedAt: record?.closedAt ?? null,
      closedBy: record?.closedBy ?? null,
      items,
      progress: computeProgress(items, recs),
    };
  }

  // ---------- guards ----------

  function ensurePeriodOpen(period: Period) {
    if (isClosed(period)) throw conflict('period_closed', 'This period is closed. Reopen it to make changes.');
  }

  /** Activity in a closed period, or in a signed-off reconciliation, is read-only. */
  function ensureActivityEditable(accountId: string, date: IsoDate) {
    const period = periodOf(date);
    ensurePeriodOpen(period);
    if (storedReconciliation(accountId, period).status === 'signed-off') {
      throw conflict('reconciliation_signed_off', 'This account is signed off for the period. Reopen the reconciliation first.');
    }
  }

  function openItem(period: Period, billId: string): { bill: Bill; item: CloseItem } {
    const bill = findBill(billId);
    if (!bill) throw notFound('Bill');
    ensurePeriodOpen(period);
    const item = db.items.find((i) => i.period === period && i.billId === billId) ?? generateItem(bill, period);
    if (item.status === 'offcycle') throw conflict('off_cycle', `${bill.name} is not billed in this period.`);
    return { bill, item };
  }

  function saveItem(item: CloseItem): CloseItem {
    db.items = [...db.items.filter((i) => !(i.period === item.period && i.billId === item.billId)), item];
    return clone(item);
  }

  // ---------- validation ----------

  function validateAccount(input: AccountInput) {
    const e = new FieldErrors();
    e.check(isNonEmpty(input.name), 'name', 'Enter a nickname.');
    e.check(isNonEmpty(input.institution), 'institution', 'Enter the bank.');
    e.check(oneOf(['checking', 'savings'], input.type), 'type', 'Choose checking or savings.');
    e.check(/^\d{4}$/.test(input.last4 ?? ''), 'last4', 'Enter the last 4 digits.');
    e.check(Number.isSafeInteger(input.openingBalance), 'openingBalance', 'Enter the opening balance.');
    e.check(isIsoDate(input.openingDate), 'openingDate', 'Enter a valid date.');
    e.throwIfAny();
  }

  function validateBill(input: BillInput) {
    const e = new FieldErrors();
    e.check(isNonEmpty(input.name), 'name', 'Enter the biller name.');
    e.check(oneOf(CATEGORIES, input.category), 'category', 'Choose a type.');
    e.check(Array.isArray(input.lines) && input.lines.length > 0 && input.lines.every(isNonEmpty), 'lines', 'Pick at least one service.');
    e.check(oneOf(FREQUENCIES, input.frequency), 'frequency', 'Choose how often.');
    if (input.frequency !== 'monthly') e.check(isIntInRange(input.cycleAnchorMonth, 1, 12), 'cycleAnchorMonth', 'Choose which months it is billed in.');
    if (input.statementDay == null) {
      e.check(input.category === 'loan', 'statementDay', 'Enter a statement day from 1 to 31.');
    } else {
      e.check(isIntInRange(input.statementDay, 1, 31), 'statementDay', 'Enter a statement day from 1 to 31.');
    }
    if (input.dueRule?.kind === 'fixed-day') {
      e.check(isIntInRange(input.dueRule.day, 1, 31), 'dueRule', 'Enter a due day from 1 to 31.');
    } else if (input.dueRule?.kind === 'days-after-statement') {
      e.check(isIntInRange(input.dueRule.days, 1, 90), 'dueRule', 'Enter 1 to 90 days.');
      e.check(input.statementDay != null, 'dueRule', 'A due date after the statement needs a statement day.');
    } else {
      e.add('dueRule', 'Choose a due rule.');
    }
    e.check(oneOf(['fixed', 'varies'], input.amountType), 'amountType', 'Choose fixed or varies.');
    e.check(isNonNegativeCents(input.typicalAmount), 'typicalAmount', 'Enter an amount of $0.00 or more.');
    e.check(!!findAccount(input.accountId), 'accountId', 'Choose an account.');
    e.check(/^\d{0,4}$/.test(input.reference ?? ''), 'reference', 'Use up to 4 digits.');
    if (input.loan) {
      e.check(isNonNegativeCents(input.loan.balance), 'loan.balance', 'Enter the current balance.');
      e.check(isIntInRange(input.loan.paymentsLeft, 0, 1200), 'loan.paymentsLeft', 'Enter the payments left.');
      e.check(input.loan.aprBps === null || isIntInRange(input.loan.aprBps, 0, 10000), 'loan.aprBps', 'Enter an APR from 0 to 100%.');
    }
    e.throwIfAny();
  }

  function validateStatement(input: StatementInput) {
    const e = new FieldErrors();
    e.check(isOptionalDate(input.statementDate), 'statementDate', 'Enter a valid date.');
    e.check(isIsoDate(input.dueDate), 'dueDate', 'Enter a valid due date.');
    e.check(Array.isArray(input.lines) && input.lines.length > 0, 'lines', 'Enter at least one amount.');
    input.lines?.forEach((line, i) => {
      e.check(isNonEmpty(line.name), `lines.${i}`, 'Name this line.');
      e.check(isNonNegativeCents(line.amount), `lines.${i}`, 'Enter an amount of $0.00 or more.');
    });
    if (input.servicePeriod) {
      const { start, end } = input.servicePeriod;
      e.check(isIsoDate(start) && isIsoDate(end) && start <= end, 'servicePeriod', 'Enter a start date on or before the end date.');
    }
    e.check(input.minimumDue === null || isNonNegativeCents(input.minimumDue), 'minimumDue', 'Enter an amount of $0.00 or more.');
    e.throwIfAny();
  }

  function validatePayment(input: PaymentInput) {
    const e = new FieldErrors();
    e.check(isIsoDate(input.date), 'date', 'Enter a valid payment date.');
    e.check(!!findAccount(input.accountId), 'accountId', 'Choose an account.');
    e.check(isNonNegativeCents(input.amount) && input.amount > 0, 'amount', 'Enter an amount greater than $0.00.');
    e.check(oneOf(METHODS, input.method), 'method', 'Choose a payment method.');
    e.throwIfAny();
  }

  function validateTransaction(input: NewTransactionInput) {
    const e = new FieldErrors();
    e.check(oneOf(['expense', 'deposit', 'transfer'], input.kind), 'kind', 'Choose a type.');
    e.check(isIsoDate(input.date), 'date', 'Enter a valid date.');
    e.check(!!findAccount(input.accountId), 'accountId', 'Choose an account.');
    e.check(isNonNegativeCents(input.amount) && input.amount > 0, 'amount', 'Enter an amount greater than $0.00.');
    if (input.kind === 'transfer') {
      e.check(!!findAccount(input.toAccountId), 'toAccountId', 'Choose an account.');
      e.check(input.toAccountId !== input.accountId, 'toAccountId', 'Choose a different account.');
    } else {
      e.check(isNonEmpty(input.description), 'description', 'Enter a description.');
      e.check(isNonEmpty(input.category), 'category', 'Choose a category.');
    }
    e.throwIfAny();
  }

  // ---------- API ----------

  const api: HomeCloseApi = {
    session: {
      async get() {
        return clone(db.session);
      },
      // Auth is UI-only in v0: any input signs in to the sample household.
      async login() {
        return clone(db.session);
      },
      async signup(input) {
        const pick = (value: string | undefined, fallback: string) => (isNonEmpty(value) ? value.trim() : fallback);
        db.session = {
          ...db.session,
          user: {
            firstName: pick(input.firstName, db.session.user.firstName),
            lastName: pick(input.lastName, db.session.user.lastName),
            email: pick(input.email, db.session.user.email),
          },
          household: {
            name: pick(input.householdName, db.session.household.name),
            startPeriod: isPeriod(input.startPeriod) ? input.startPeriod : db.session.household.startPeriod,
          },
        };
        return clone(db.session);
      },
      async logout() {},
    },

    accounts: {
      async list() {
        return db.accounts.map(toAccount);
      },
      async get(id) {
        const account = findAccount(id);
        if (!account) throw notFound('Account');
        return toAccount(account);
      },
      async create(input) {
        validateAccount(input);
        const account: StoredAccount = {
          ...pickAccount(input),
          id: nextId('acc-'),
          role: input.type === 'savings' ? 'Savings' : 'Checking',
          color: ACCOUNT_COLORS[db.accounts.length % ACCOUNT_COLORS.length]!,
        };
        db.accounts = [...db.accounts, account];
        return toAccount(account);
      },
      async update(id, input) {
        const existing = findAccount(id);
        if (!existing) throw notFound('Account');
        validateAccount(input);
        const account = { ...existing, ...pickAccount(input) };
        db.accounts = db.accounts.map((a) => (a.id === id ? account : a));
        return toAccount(account);
      },
    },

    bills: {
      async list() {
        return clone(db.bills);
      },
      async get(id) {
        const bill = findBill(id);
        if (!bill) throw notFound('Bill');
        return clone(bill);
      },
      async create(input) {
        validateBill(input);
        const bill: Bill = {
          ...normalizeBill(input),
          id: nextId('bill-'),
          color: BILL_COLORS[db.bills.length % BILL_COLORS.length]!,
          initials: input.name.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase(),
        };
        db.bills = [...db.bills, bill];
        return clone(bill);
      },
      async update(id, input) {
        const existing = findBill(id);
        if (!existing) throw notFound('Bill');
        validateBill(input);
        const bill = { ...existing, ...normalizeBill(input) };
        db.bills = db.bills.map((b) => (b.id === id ? bill : b));
        return clone(bill);
      },
    },

    periods: {
      async get(period) {
        return clone(periodView(requirePeriod(period)));
      },
      async saveStatement(period, billId, input) {
        const { item } = openItem(requirePeriod(period), billId);
        validateStatement(input);
        return saveItem(applyStatement(item, input));
      },
      async schedulePayment(period, billId, input) {
        const { item } = openItem(requirePeriod(period), billId);
        validatePayment(input);
        if (item.status === 'paid') throw conflict('already_paid', 'This bill is already paid.');
        return saveItem(applySchedule(item, input));
      },
      async recordPayment(period, billId, input) {
        const { bill, item } = openItem(requirePeriod(period), billId);
        validatePayment(input);
        ensureActivityEditable(input.accountId, input.date);
        const existing = item.transactionId ? db.transactions.find((t) => t.id === item.transactionId) : undefined;
        const transaction: Transaction = {
          id: existing?.id ?? nextId('t'),
          accountId: input.accountId,
          date: input.date,
          description: `${bill.name} — payment`,
          category: 'Bill payment',
          kind: 'bill-payment',
          amount: -input.amount,
          cleared: existing?.cleared ?? false,
          billId: bill.id,
          billPeriod: period,
        };
        db.transactions = [...db.transactions.filter((t) => t.id !== transaction.id), transaction];
        return saveItem(applyPayment(item, input, transaction.id));
      },
      async close(period) {
        requirePeriod(period);
        ensurePeriodOpen(period);
        if (!periodView(period).progress.canLock) {
          throw conflict('close_incomplete', 'Pay every bill and reconcile every account before locking the period.');
        }
        db.periods = [
          ...db.periods.filter((p) => p.period !== period),
          { period, status: 'closed', closedAt: today(), closedBy: fullName() },
        ];
        return clone(periodView(period));
      },
      async reopen(period) {
        requirePeriod(period);
        db.periods = db.periods.filter((p) => p.period !== period);
        return clone(periodView(period));
      },
    },

    transactions: {
      async list(filter = {}) {
        return clone(
          db.transactions
            .filter((t) => !filter.accountId || t.accountId === filter.accountId)
            .filter((t) => !filter.period || periodOf(t.date) === filter.period)
            .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id, undefined, { numeric: true })),
        );
      },
      async create(input) {
        validateTransaction(input);
        ensureActivityEditable(input.accountId, input.date);
        let created: Transaction[];
        if (input.kind === 'transfer') {
          ensureActivityEditable(input.toAccountId, input.date);
          const from = findAccount(input.accountId)!;
          const to = findAccount(input.toAccountId)!;
          const base = { date: input.date, category: 'Transfer', kind: 'transfer' as const, cleared: false, billId: null, billPeriod: null };
          created = [
            { ...base, id: nextId('t'), accountId: from.id, amount: -input.amount, description: input.description.trim() || `Transfer to ${to.institution} ••${to.last4}` },
            { ...base, id: nextId('t'), accountId: to.id, amount: input.amount, description: input.description.trim() || `Transfer from ${from.institution} ••${from.last4}` },
          ];
        } else {
          created = [
            {
              id: nextId('t'),
              accountId: input.accountId,
              date: input.date,
              description: input.description.trim(),
              category: input.category,
              kind: input.kind,
              amount: input.kind === 'expense' ? -input.amount : input.amount,
              cleared: false,
              billId: null,
              billPeriod: null,
            },
          ];
        }
        db.transactions = [...db.transactions, ...created];
        return clone(created);
      },
      async setCleared(id, cleared) {
        const transaction = db.transactions.find((t) => t.id === id);
        if (!transaction) throw notFound('Transaction');
        ensureActivityEditable(transaction.accountId, transaction.date);
        const updated = { ...transaction, cleared };
        db.transactions = db.transactions.map((t) => (t.id === id ? updated : t));
        return clone(updated);
      },
    },

    reconciliations: {
      async list(period) {
        requirePeriod(period);
        return db.accounts.map((a) => toReconciliation(storedReconciliation(a.id, period)));
      },
      async get(accountId, period) {
        requirePeriod(period);
        if (!findAccount(accountId)) throw notFound('Account');
        return toReconciliation(storedReconciliation(accountId, period));
      },
      async update(accountId, period, input) {
        requirePeriod(period);
        if (!findAccount(accountId)) throw notFound('Account');
        ensurePeriodOpen(period);
        const rec = storedReconciliation(accountId, period);
        if (rec.status === 'signed-off') throw conflict('reconciliation_signed_off', 'Reopen the reconciliation to change it.');
        const e = new FieldErrors();
        e.check(input.bankBalance === null || Number.isSafeInteger(input.bankBalance), 'bankBalance', 'Enter the bank balance.');
        e.check(isOptionalDate(input.asOf), 'asOf', 'Enter a valid date.');
        e.throwIfAny();
        const updated = { ...rec, bankBalance: input.bankBalance, asOf: input.asOf };
        saveReconciliation(updated);
        return toReconciliation(updated);
      },
      async signOff(accountId, period) {
        requirePeriod(period);
        if (!findAccount(accountId)) throw notFound('Account');
        ensurePeriodOpen(period);
        const stored = storedReconciliation(accountId, period);
        if (!canSignOff(toReconciliation(stored).summary)) throw conflict('not_balanced', 'The difference must be $0.00 before you can sign off.');
        const updated: StoredReconciliation = { ...stored, status: 'signed-off', asOf: stored.asOf ?? today(), signedOffAt: today(), signedOffBy: fullName() };
        saveReconciliation(updated);
        return toReconciliation(updated);
      },
      async reopen(accountId, period) {
        requirePeriod(period);
        if (!findAccount(accountId)) throw notFound('Account');
        ensurePeriodOpen(period);
        const updated: StoredReconciliation = { ...storedReconciliation(accountId, period), status: 'open', signedOffAt: null, signedOffBy: null };
        saveReconciliation(updated);
        return toReconciliation(updated);
      },
    },
  };

  return {
    api,
    reset() {
      db = seed();
      seq = 100;
    },
  };
}

function pickAccount(input: AccountInput) {
  return {
    name: input.name.trim(),
    institution: input.institution.trim(),
    type: input.type,
    last4: input.last4,
    openingBalance: input.openingBalance,
    openingDate: input.openingDate,
  };
}

function normalizeBill(input: BillInput): BillInput {
  return {
    ...input,
    name: input.name.trim(),
    lines: input.lines.map((l) => l.trim()),
    cycleAnchorMonth: input.frequency === 'monthly' ? null : input.cycleAnchorMonth,
    loan: input.category === 'loan' ? input.loan : null,
    defaultPayment: input.category === 'credit-card' ? (input.defaultPayment ?? 'statement') : null,
  };
}
