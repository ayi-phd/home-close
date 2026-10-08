/**
 * Sample household from design/home-close-prototype.html (example figures, not real data).
 * Stored records only: balances, reconciliation summaries and November's checklist are derived.
 * Ids here are fixture keys; the seed maps them to ObjectIds.
 */
import type { Account, Bill, CloseItem, IsoDate, Period, Reconciliation, Session, Transaction } from '../types.ts';

export type StoredAccount = Omit<Account, 'balances' | 'lastReconciled'>;
export type StoredReconciliation = Omit<Reconciliation, 'summary'>;

export interface StoredPeriod {
  period: Period;
  status: 'open' | 'closed';
  closedAt: IsoDate | null;
  closedBy: string | null;
}

export interface FixtureData {
  session: Session;
  accounts: StoredAccount[];
  bills: Bill[];
  items: CloseItem[];
  periods: StoredPeriod[];
  transactions: Transaction[];
  reconciliations: StoredReconciliation[];
}

const item = (fields: Partial<CloseItem> & Pick<CloseItem, 'billId' | 'period' | 'status' | 'amount' | 'accountId'>): CloseItem => ({
  statementDate: null,
  dueDate: null,
  estimated: false,
  lines: [],
  servicePeriod: null,
  minimumDue: null,
  scheduledDate: null,
  paidDate: null,
  paidAmount: null,
  method: null,
  confirmation: null,
  transactionId: null,
  signedOff: false,
  next: null,
  ...fields,
});

const paid = (billId: string, period: Period, statementDate: IsoDate | null, dueDate: IsoDate, line: string, amount: number, paidDate: IsoDate, accountId: string, method: CloseItem['method'], transactionId: string | null = null) =>
  item({
    billId, period, status: 'paid', statementDate, dueDate, amount, accountId,
    lines: [{ name: line, amount }], paidDate, paidAmount: amount, method, transactionId, signedOff: true,
  });

const tx = (id: string, date: IsoDate, description: string, category: string, kind: Transaction['kind'], accountId: string, amount: number, cleared: boolean, billId: string | null = null): Transaction => ({
  id, date, description, category, kind, accountId, amount, cleared, billId, billPeriod: billId ? '2026-10' : null,
});

export function createFixtures(): FixtureData {
  return {
    session: {
      user: { firstName: 'Alex', lastName: 'Rivera', email: 'alex.rivera@example.com' },
      household: { name: 'Rivera Household', startPeriod: '2026-09' },
      today: '2026-10-07',
      currentPeriod: '2026-10',
    },
    accounts: [
      { id: 'chk', name: 'Chase Total Checking', institution: 'Chase', type: 'checking', last4: '8812', openingBalance: 642018, openingDate: '2026-10-01', role: 'Primary · bills & groceries', color: '#117ACA' },
      { id: 'wf', name: 'Wells Fargo Everyday', institution: 'Wells Fargo', type: 'checking', last4: '2290', openingBalance: 210455, openingDate: '2026-10-01', role: 'Autopay account', color: '#C9302C' },
      { id: 'ally', name: 'Ally Online Savings', institution: 'Ally Bank', type: 'savings', last4: '5017', openingBalance: 1825000, openingDate: '2026-10-01', role: 'Emergency fund', color: '#6B2C91' },
    ],
    bills: [
      { id: 'ladwp', name: 'LADWP', category: 'utilities', lines: ['Electricity', 'Water', 'Trash pickup'], frequency: 'bimonthly', cycleAnchorMonth: 1, statementDay: 28, dueRule: { kind: 'days-after-statement', days: 21 }, amountType: 'varies', typicalAmount: 28000, accountId: 'chk', autopay: false, reference: '4471', defaultPayment: null, loan: null, color: '#00539B', initials: 'DWP' },
      { id: 'socal', name: 'SoCalGas', category: 'utilities', lines: ['Gas'], frequency: 'monthly', cycleAnchorMonth: null, statementDay: 9, dueRule: { kind: 'days-after-statement', days: 19 }, amountType: 'varies', typicalAmount: 4100, accountId: 'chk', autopay: false, reference: '0932', defaultPayment: null, loan: null, color: '#0F7AC0', initials: 'SCG' },
      { id: 'spectrum', name: 'Spectrum', category: 'internet-mobile', lines: ['Internet 500 Mbps'], frequency: 'monthly', cycleAnchorMonth: null, statementDay: 18, dueRule: { kind: 'fixed-day', day: 3 }, amountType: 'fixed', typicalAmount: 7999, accountId: 'chk', autopay: false, reference: '6610', defaultPayment: null, loan: null, color: '#1E5AA8', initials: 'SP' },
      { id: 'verizon', name: 'Verizon Wireless', category: 'internet-mobile', lines: ['Mobile · 2 lines'], frequency: 'monthly', cycleAnchorMonth: null, statementDay: 22, dueRule: { kind: 'fixed-day', day: 15 }, amountType: 'varies', typicalAmount: 14200, accountId: 'wf', autopay: true, reference: '2215', defaultPayment: null, loan: null, color: '#D52B1E', initials: 'VZ' },
      { id: 'sapphire', name: 'Chase Sapphire Preferred', category: 'credit-card', lines: ['Pay statement balance'], frequency: 'monthly', cycleAnchorMonth: null, statementDay: 26, dueRule: { kind: 'fixed-day', day: 23 }, amountType: 'varies', typicalAmount: 115000, accountId: 'chk', autopay: false, reference: '3305', defaultPayment: 'statement', loan: null, color: '#1A3A6B', initials: 'CSP' },
      { id: 'amex', name: 'Amex Blue Cash Everyday', category: 'credit-card', lines: ['Pay statement balance'], frequency: 'monthly', cycleAnchorMonth: null, statementDay: 9, dueRule: { kind: 'fixed-day', day: 4 }, amountType: 'varies', typicalAmount: 60000, accountId: 'chk', autopay: false, reference: '1009', defaultPayment: 'statement', loan: null, color: '#2E77BB', initials: 'AX' },
      { id: 'toyota', name: 'Toyota Financial', category: 'loan', lines: ['2023 RAV4 · 37 of 60 paid'], frequency: 'monthly', cycleAnchorMonth: null, statementDay: null, dueRule: { kind: 'fixed-day', day: 15 }, amountType: 'fixed', typicalAmount: 41236, accountId: 'wf', autopay: true, reference: '7781', defaultPayment: null, loan: { balance: 948612, paymentsLeft: 23, aprBps: null }, color: '#4A4F57', initials: 'TFS' },
    ],
    periods: [{ period: '2026-09', status: 'closed', closedAt: '2026-10-04', closedBy: 'Alex Rivera' }],
    items: [
      // September 2026 (closed)
      paid('spectrum', '2026-09', '2026-08-18', '2026-09-03', 'Internet 500 Mbps', 7999, '2026-09-02', 'chk', 'website'),
      paid('amex', '2026-09', '2026-08-09', '2026-09-04', 'Pay statement balance', 53812, '2026-09-03', 'chk', 'website'),
      paid('verizon', '2026-09', '2026-08-22', '2026-09-15', 'Mobile · 2 lines', 14190, '2026-09-15', 'wf', 'autopay'),
      paid('toyota', '2026-09', null, '2026-09-15', '2023 RAV4 · 37 of 60 paid', 41236, '2026-09-15', 'wf', 'autopay'),
      paid('sapphire', '2026-09', '2026-08-26', '2026-09-23', 'Pay statement balance', 102280, '2026-09-20', 'chk', 'website'),
      paid('socal', '2026-09', '2026-09-09', '2026-09-28', 'Gas', 3615, '2026-09-25', 'chk', 'website'),
      // October 2026 (open)
      paid('spectrum', '2026-10', '2026-09-18', '2026-10-03', 'Internet 500 Mbps', 7999, '2026-10-02', 'chk', 'website', 't3'),
      paid('amex', '2026-10', '2026-09-09', '2026-10-04', 'Pay statement balance', 61240, '2026-10-03', 'chk', 'website', 't4'),
      item({ billId: 'verizon', period: '2026-10', status: 'scheduled', statementDate: '2026-09-22', dueDate: '2026-10-15', amount: 14218, accountId: 'wf', lines: [{ name: 'Mobile · 2 lines', amount: 14218 }], scheduledDate: '2026-10-15', method: 'autopay' }),
      item({ billId: 'toyota', period: '2026-10', status: 'scheduled', dueDate: '2026-10-15', amount: 41236, accountId: 'wf', lines: [{ name: '2023 RAV4 · 37 of 60 paid', amount: 41236 }], scheduledDate: '2026-10-15', method: 'autopay' }),
      item({
        billId: 'ladwp', period: '2026-10', status: 'entered', statementDate: '2026-09-28', dueDate: '2026-10-19', amount: 28673, accountId: 'chk',
        servicePeriod: { start: '2026-07-25', end: '2026-09-24' },
        lines: [
          { name: 'Electricity', amount: 16820 },
          { name: 'Water', amount: 7411 },
          { name: 'Trash pickup', amount: 3670 },
          { name: 'City utility tax', amount: 772 },
        ],
      }),
      item({ billId: 'sapphire', period: '2026-10', status: 'entered', statementDate: '2026-09-26', dueDate: '2026-10-23', amount: 128455, accountId: 'chk', lines: [{ name: 'Pay statement balance', amount: 128455 }] }),
      item({ billId: 'socal', period: '2026-10', status: 'awaiting', statementDate: '2026-10-09', dueDate: '2026-10-28', amount: 4100, estimated: true, accountId: 'chk', lines: [{ name: 'Gas', amount: 4100 }] }),
    ],
    transactions: [
      tx('t1', '2026-10-01', 'Payroll — Brightline Health', 'Income', 'deposit', 'chk', 385000, true),
      tx('t2', '2026-10-01', 'Transfer to Wells Fargo ••2290', 'Transfer', 'transfer', 'chk', -150000, true),
      tx('t3', '2026-10-02', 'Spectrum — Internet', 'Bill payment', 'bill-payment', 'chk', -7999, true, 'spectrum'),
      tx('t4', '2026-10-03', 'Amex Blue Cash — payment', 'Bill payment', 'bill-payment', 'chk', -61240, true, 'amex'),
      tx('t5', '2026-10-04', "Trader Joe's #142", 'Groceries', 'expense', 'chk', -8427, false),
      tx('t6', '2026-10-05', 'Shell — Sunset Blvd', 'Auto & fuel', 'expense', 'chk', -5210, false),
      tx('t7', '2026-10-06', 'Costco Wholesale', 'Household', 'expense', 'chk', -21345, false),
      tx('t8', '2026-10-01', 'Transfer from Chase ••8812', 'Transfer', 'transfer', 'wf', 150000, true),
      tx('t9', '2026-10-05', 'State Farm — auto insurance', 'Insurance', 'expense', 'wf', -14800, true),
    ],
    reconciliations: [
      ...['chk', 'wf', 'ally'].map((accountId): StoredReconciliation => ({
        accountId, period: '2026-09', bankBalance: { chk: 642018, wf: 210455, ally: 1825000 }[accountId]!, asOf: '2026-09-30',
        status: 'signed-off', signedOffAt: '2026-09-30', signedOffBy: 'Alex Rivera',
      })),
      { accountId: 'chk', period: '2026-10', bankBalance: 799352, asOf: '2026-10-07', status: 'open', signedOffAt: null, signedOffBy: null },
      { accountId: 'wf', period: '2026-10', bankBalance: 345655, asOf: '2026-10-07', status: 'open', signedOffAt: null, signedOffBy: null },
      { accountId: 'ally', period: '2026-10', bankBalance: 1825000, asOf: '2026-10-07', status: 'open', signedOffAt: null, signedOffBy: null },
    ],
  };
}
