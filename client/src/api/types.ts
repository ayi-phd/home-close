/**
 * The client's API contract. Wire shapes come from @home-close/shared (the same types the server
 * uses); this file adds the error class and the interface both API implementations satisfy.
 */

export type * from '@home-close/shared';
import type {
  Account,
  AccountInput,
  Bill,
  BillInput,
  Cents,
  CloseItem,
  ClosePeriod,
  IsoDate,
  LoginInput,
  NewTransactionInput,
  PaymentInput,
  Period,
  Reconciliation,
  Session,
  SignupInput,
  StatementInput,
  Transaction,
  TransactionFilter,
} from '@home-close/shared';

// ---------- Errors ----------

export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
  }
}

// ---------- Client contract ----------

/** One method per REST endpoint. Implemented over HTTP (http.ts) and in memory (mock/). */
export interface HomeCloseApi {
  session: {
    /** GET /session */
    get(): Promise<Session>;
    /** POST /session */
    login(input: LoginInput): Promise<Session>;
    /** POST /households */
    signup(input: SignupInput): Promise<Session>;
    /** DELETE /session */
    logout(): Promise<void>;
  };
  accounts: {
    /** GET /accounts */
    list(): Promise<Account[]>;
    /** GET /accounts/:id */
    get(id: string): Promise<Account>;
    /** POST /accounts */
    create(input: AccountInput): Promise<Account>;
    /** PUT /accounts/:id */
    update(id: string, input: AccountInput): Promise<Account>;
  };
  bills: {
    /** GET /bills */
    list(): Promise<Bill[]>;
    /** GET /bills/:id */
    get(id: string): Promise<Bill>;
    /** POST /bills */
    create(input: BillInput): Promise<Bill>;
    /** PUT /bills/:id */
    update(id: string, input: BillInput): Promise<Bill>;
  };
  periods: {
    /** GET /periods/:period (items are also served at /periods/:period/items) */
    get(period: Period): Promise<ClosePeriod>;
    /** PUT /periods/:period/items/:billId/statement */
    saveStatement(period: Period, billId: string, input: StatementInput): Promise<CloseItem>;
    /** PUT /periods/:period/items/:billId/schedule */
    schedulePayment(period: Period, billId: string, input: PaymentInput): Promise<CloseItem>;
    /** PUT /periods/:period/items/:billId/payment */
    recordPayment(period: Period, billId: string, input: PaymentInput): Promise<CloseItem>;
    /** POST /periods/:period/close */
    close(period: Period): Promise<ClosePeriod>;
    /** POST /periods/:period/reopen */
    reopen(period: Period): Promise<ClosePeriod>;
  };
  transactions: {
    /** GET /transactions?accountId=&period= */
    list(filter?: TransactionFilter): Promise<Transaction[]>;
    /** POST /transactions (a transfer creates both sides) */
    create(input: NewTransactionInput): Promise<Transaction[]>;
    /** PATCH /transactions/:id */
    setCleared(id: string, cleared: boolean): Promise<Transaction>;
  };
  reconciliations: {
    /** GET /reconciliations?period= */
    list(period: Period): Promise<Reconciliation[]>;
    /** GET /reconciliations/:accountId/:period */
    get(accountId: string, period: Period): Promise<Reconciliation>;
    /** PUT /reconciliations/:accountId/:period */
    update(accountId: string, period: Period, input: { bankBalance: Cents | null; asOf: IsoDate | null }): Promise<Reconciliation>;
    /** POST /reconciliations/:accountId/:period/sign-off */
    signOff(accountId: string, period: Period): Promise<Reconciliation>;
    /** POST /reconciliations/:accountId/:period/reopen */
    reopen(accountId: string, period: Period): Promise<Reconciliation>;
  };
}
