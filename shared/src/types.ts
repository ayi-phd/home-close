/**
 * Wire shapes of the Home Close REST API (`/api/v1`), shared by the client and the server.
 * Money is integer cents. Dates are ISO `YYYY-MM-DD`. A close period is `YYYY-MM`.
 */

export type Cents = number;
export type IsoDate = string;
export type Period = string;

// ---------- Session (auth is UI-only in v0) ----------

export interface User {
  firstName: string;
  lastName: string;
  email: string;
}

export interface Household {
  name: string;
  startPeriod: Period;
}

export interface Session {
  user: User;
  household: Household;
  /** Server "today", so the client never guesses the household's current period. */
  today: IsoDate;
  currentPeriod: Period;
}

export interface LoginInput {
  email: string;
  password: string;
  remember: boolean;
}

export interface SignupInput {
  firstName: string;
  lastName: string;
  householdName: string;
  email: string;
  password: string;
  startPeriod: Period;
}

// ---------- Accounts ----------

export type AccountType = 'checking' | 'savings';

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  last4: string;
  openingBalance: Cents;
  openingDate: IsoDate;
  role: string;
  color: string;
  /** Derived by the API. */
  balances: {
    book: Cents;
    cleared: Cents;
    unclearedCount: number;
  };
  /** As-of date of the latest signed-off reconciliation, derived by the API. */
  lastReconciled: IsoDate | null;
}

export interface AccountInput {
  name: string;
  institution: string;
  type: AccountType;
  last4: string;
  openingBalance: Cents;
  openingDate: IsoDate;
}

// ---------- Bills ----------

export type BillCategory = 'utilities' | 'internet-mobile' | 'credit-card' | 'loan';
export type Frequency = 'monthly' | 'bimonthly' | 'quarterly';
export type AmountType = 'fixed' | 'varies';
export type DefaultPayment = 'statement' | 'minimum' | 'fixed';

export type DueRule =
  | { kind: 'fixed-day'; day: number }
  | { kind: 'days-after-statement'; days: number };

export interface LoanDetails {
  balance: Cents;
  paymentsLeft: number;
  /** Annual rate in basis points (4.90% = 490). */
  aprBps: number | null;
}

export interface Bill {
  id: string;
  name: string;
  category: BillCategory;
  /** Service lines billed together on one statement (e.g. electricity, water, trash pickup). */
  lines: string[];
  frequency: Frequency;
  /** A month (1–12) in which a statement is issued. Anchors bimonthly and quarterly cycles. */
  cycleAnchorMonth: number | null;
  /** Day of month the statement closes. Null for bills without statements (e.g. some loans). */
  statementDay: number | null;
  dueRule: DueRule;
  amountType: AmountType;
  typicalAmount: Cents;
  accountId: string;
  autopay: boolean;
  /** Last digits of the biller account or card. */
  reference: string;
  defaultPayment: DefaultPayment | null;
  loan: LoanDetails | null;
  color: string;
  initials: string;
}

export type BillInput = Omit<Bill, 'id' | 'color' | 'initials'>;

// ---------- Close periods ----------

export type ItemStatus = 'awaiting' | 'entered' | 'scheduled' | 'paid' | 'offcycle';
export type PaymentMethod = 'website' | 'autopay' | 'bill-pay' | 'check';

export interface StatementLine {
  name: string;
  amount: Cents;
}

export interface CloseItem {
  billId: string;
  period: Period;
  status: ItemStatus;
  /** Statement date, or the expected one while awaiting. Null when the bill has no statements. */
  statementDate: IsoDate | null;
  dueDate: IsoDate | null;
  amount: Cents;
  /** True while the amount is the bill's typical amount rather than a real statement. */
  estimated: boolean;
  lines: StatementLine[];
  servicePeriod: { start: IsoDate; end: IsoDate } | null;
  minimumDue: Cents | null;
  accountId: string;
  scheduledDate: IsoDate | null;
  paidDate: IsoDate | null;
  paidAmount: Cents | null;
  method: PaymentMethod | null;
  confirmation: string | null;
  transactionId: string | null;
  signedOff: boolean;
  /** Only for off-cycle items: when the bill is next billed. */
  next: { statementDate: IsoDate | null; dueDate: IsoDate } | null;
}

export interface CloseProgress {
  billCount: number;
  offCycleCount: number;
  estimatedCount: number;
  byStatus: Record<'awaiting' | 'entered' | 'scheduled' | 'paid', number>;
  accountCount: number;
  reconciledCount: number;
  tasks: number;
  tasksDone: number;
  totalDue: Cents;
  paid: Cents;
  remaining: Cents;
  canLock: boolean;
}

export interface ClosePeriod {
  period: Period;
  status: 'open' | 'closed';
  closedAt: IsoDate | null;
  closedBy: string | null;
  items: CloseItem[];
  progress: CloseProgress;
}

export interface StatementInput {
  statementDate: IsoDate | null;
  dueDate: IsoDate;
  lines: StatementLine[];
  servicePeriod: { start: IsoDate; end: IsoDate } | null;
  minimumDue: Cents | null;
}

export interface PaymentInput {
  date: IsoDate;
  accountId: string;
  amount: Cents;
  method: PaymentMethod;
  confirmation: string | null;
}

// ---------- Transactions ----------

export type TransactionKind = 'expense' | 'deposit' | 'transfer' | 'bill-payment';

export interface Transaction {
  id: string;
  accountId: string;
  date: IsoDate;
  description: string;
  category: string;
  kind: TransactionKind;
  /** Signed: negative for money out of the account. */
  amount: Cents;
  cleared: boolean;
  billId: string | null;
  /** Close period the linked bill belongs to. */
  billPeriod: Period | null;
}

export interface TransactionFilter {
  accountId?: string;
  period?: Period;
}

export type NewTransactionInput =
  | { kind: 'expense' | 'deposit'; date: IsoDate; description: string; category: string; accountId: string; amount: Cents }
  | { kind: 'transfer'; date: IsoDate; description: string; accountId: string; toAccountId: string; amount: Cents };

// ---------- Reconciliations ----------

export interface ReconciliationSummary {
  openingBalance: Cents;
  clearedDeposits: Cents;
  clearedWithdrawals: Cents;
  clearedBalance: Cents;
  unclearedCount: number;
  unclearedTotal: Cents;
  bookBalance: Cents;
  /** bank − cleared book. Null until a bank balance is entered. */
  difference: Cents | null;
}

export interface Reconciliation {
  accountId: string;
  period: Period;
  bankBalance: Cents | null;
  asOf: IsoDate | null;
  status: 'open' | 'signed-off';
  signedOffAt: IsoDate | null;
  signedOffBy: string | null;
  summary: ReconciliationSummary;
}
