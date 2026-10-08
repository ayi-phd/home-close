import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../types';
import { createMockApi } from './mockApi';

let api: ReturnType<typeof createMockApi>['api'];

beforeEach(() => {
  api = createMockApi().api;
});

const payment = { date: '2026-10-07', accountId: 'chk', amount: 128455, method: 'website' as const, confirmation: null };

async function expectApiError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status, code });
  return error as ApiError;
}

describe('mock API', () => {
  it('serves the prototype household', async () => {
    const accounts = await api.accounts.list();
    expect(accounts.map((a) => a.name)).toEqual(['Chase Total Checking', 'Wells Fargo Everyday', 'Ally Online Savings']);
    expect(accounts[0]).toMatchObject({ balances: { unclearedCount: 3 }, lastReconciled: '2026-09-30' });
  });

  it('generates upcoming periods from the bills', async () => {
    const november = await api.periods.get('2026-11');
    expect(november.items.find((i) => i.billId === 'ladwp')?.status).toBe('offcycle');
    expect(november.progress.billCount).toBe(6);
  });

  it('recording a payment marks the bill paid and adds a transaction to the paying account', async () => {
    const item = await api.periods.recordPayment('2026-10', 'sapphire', payment);
    expect(item).toMatchObject({ status: 'paid', paidDate: '2026-10-07', signedOff: true });
    const txs = await api.transactions.list({ accountId: 'chk' });
    expect(txs.find((t) => t.id === item.transactionId)).toMatchObject({
      amount: -128455, billId: 'sapphire', kind: 'bill-payment', cleared: false, billPeriod: '2026-10',
    });
  });

  it('re-recording a payment updates the same transaction', async () => {
    const first = await api.periods.recordPayment('2026-10', 'sapphire', payment);
    const second = await api.periods.recordPayment('2026-10', 'sapphire', { ...payment, amount: 100000 });
    expect(second.transactionId).toBe(first.transactionId);
    const linked = (await api.transactions.list()).filter((t) => t.billId === 'sapphire');
    expect(linked).toHaveLength(1);
    expect(linked[0]!.amount).toBe(-100000);
  });

  it('entering a statement stores each service line', async () => {
    const item = await api.periods.saveStatement('2026-10', 'socal', {
      statementDate: '2026-10-09', dueDate: '2026-10-28', servicePeriod: null, minimumDue: null,
      lines: [{ name: 'Gas', amount: 3922 }],
    });
    expect(item).toMatchObject({ status: 'entered', amount: 3922, estimated: false });
  });

  it('rejects invalid input with field errors', async () => {
    const error = await expectApiError(api.periods.recordPayment('2026-10', 'sapphire', { ...payment, amount: 0, date: '10/7' }), 400, 'validation_failed');
    expect(Object.keys(error.fields ?? {})).toEqual(['date', 'amount']);
  });

  it('keeps a closed period read-only until it is reopened', async () => {
    await expectApiError(api.periods.saveStatement('2026-09', 'amex', {
      statementDate: null, dueDate: '2026-09-04', lines: [{ name: 'x', amount: 1 }], servicePeriod: null, minimumDue: null,
    }), 409, 'period_closed');
    await api.periods.reopen('2026-09');
    expect((await api.periods.get('2026-09')).status).toBe('open');
  });

  it('refuses to lock a period with open items', async () => {
    await expectApiError(api.periods.close('2026-10'), 409, 'close_incomplete');
  });

  it('refuses to change off-cycle items', async () => {
    await expectApiError(api.periods.schedulePayment('2026-11', 'ladwp', payment), 409, 'off_cycle');
  });

  it('allows sign-off only at a $0.00 difference', async () => {
    await expectApiError(api.reconciliations.signOff('chk', '2026-10'), 409, 'not_balanced');
    await api.transactions.setCleared('t5', true);
    const rec = await api.reconciliations.signOff('chk', '2026-10');
    expect(rec).toMatchObject({ status: 'signed-off', signedOffBy: 'Alex Rivera', summary: { difference: 0 } });
    await expectApiError(api.transactions.setCleared('t6', true), 409, 'reconciliation_signed_off');
    await api.reconciliations.reopen('chk', '2026-10');
    await expect(api.transactions.setCleared('t6', true)).resolves.toMatchObject({ cleared: true });
  });

  it('creates both sides of a transfer', async () => {
    const created = await api.transactions.create({ kind: 'transfer', date: '2026-10-07', description: '', accountId: 'chk', toAccountId: 'ally', amount: 50000 });
    expect(created.map((t) => [t.accountId, t.amount, t.description])).toEqual([
      ['chk', -50000, 'Transfer to Ally Bank ••5017'],
      ['ally', 50000, 'Transfer from Chase ••8812'],
    ]);
  });

  it('stores expenses as money out and deposits as money in', async () => {
    const [expense] = await api.transactions.create({ kind: 'expense', date: '2026-10-07', description: 'Ralphs', category: 'Groceries', accountId: 'chk', amount: 4520 });
    const [deposit] = await api.transactions.create({ kind: 'deposit', date: '2026-10-07', description: 'Refund', category: 'Income', accountId: 'chk', amount: 1000 });
    expect([expense!.amount, deposit!.amount]).toEqual([-4520, 1000]);
  });

  it('creates and updates accounts and bills', async () => {
    const account = await api.accounts.create({ name: 'Joint', institution: 'Bank of America', type: 'checking', last4: '1234', openingBalance: 100000, openingDate: '2026-10-01' });
    expect(account.balances.book).toBe(100000);
    await expectApiError(api.accounts.update(account.id, { ...account, last4: '12' }), 400, 'validation_failed');

    const ladwp = await api.bills.get('ladwp');
    const updated = await api.bills.update('ladwp', { ...ladwp, autopay: true, lines: [...ladwp.lines, 'Sewer'] });
    expect(updated.lines).toContain('Sewer');
    const created = await api.bills.create({ ...ladwp, name: 'City of LA Sanitation', accountId: account.id });
    expect(created).toMatchObject({ initials: 'CIT', accountId: account.id });
  });
});
