import { describe, expect, it } from 'vitest';
import { useTestApi } from '../test/api.ts';

const { api, id } = useTestApi();

describe('/api/v1/transactions', () => {
  it('lists newest first and filters by account and period', async () => {
    const all = await api().get('/api/v1/transactions?period=2026-10').expect(200);
    expect(all.body).toHaveLength(9);
    expect(all.body[0]).toMatchObject({ description: 'Costco Wholesale', date: '2026-10-06' });
    const wf = await api().get(`/api/v1/transactions?accountId=${id('wf')}`).expect(200);
    expect(wf.body.map((t: { amount: number }) => t.amount)).toEqual([-14800, 150000]);
    expect((await api().get('/api/v1/transactions?period=2026-11').expect(200)).body).toEqual([]);
    expect((await api().get('/api/v1/transactions?period=nope').expect(400)).body.error.fields).toEqual({ period: 'Use the YYYY-MM format.' });
  });

  it('stores expenses as money out and deposits as money in', async () => {
    const [expense] = (await api().post('/api/v1/transactions').send({ kind: 'expense', date: '2026-10-07', description: 'Ralphs', category: 'Groceries', accountId: id('chk'), amount: 4520 }).expect(201)).body;
    const [deposit] = (await api().post('/api/v1/transactions').send({ kind: 'deposit', date: '2026-10-07', description: 'Refund', category: 'Income', accountId: id('chk'), amount: 1000 }).expect(201)).body;
    expect([expense.amount, deposit.amount]).toEqual([-4520, 1000]);
    expect(expense).toMatchObject({ cleared: false, billId: null, kind: 'expense' });
  });

  it('creates both sides of a transfer', async () => {
    const res = await api().post('/api/v1/transactions').send({ kind: 'transfer', date: '2026-10-07', description: '', accountId: id('chk'), toAccountId: id('ally'), amount: 50000 }).expect(201);
    expect(res.body.map((t: { accountId: string; amount: number; description: string }) => [t.accountId, t.amount, t.description])).toEqual([
      [id('chk'), -50000, 'Transfer to Ally Bank ••5017'],
      [id('ally'), 50000, 'Transfer from Chase ••8812'],
    ]);
  });

  it('validates new entries', async () => {
    const res = await api().post('/api/v1/transactions').send({ kind: 'transfer', date: '2026-10-07', accountId: id('chk'), toAccountId: id('chk'), amount: -5 }).expect(400);
    expect(res.body.error.fields).toEqual({ amount: 'Enter an amount greater than $0.00.', toAccountId: 'Choose a different account.' });
    const unknown = await api().post('/api/v1/transactions').send({ kind: 'expense', date: '2026-10-07', description: 'x', category: 'Other', accountId: '0123456789abcdef01234567', amount: 1 }).expect(400);
    expect(unknown.body.error.fields).toEqual({ accountId: 'Choose an account.' });
  });

  it('toggles the cleared flag', async () => {
    const res = await api().patch(`/api/v1/transactions/${id('t5')}`).send({ cleared: true }).expect(200);
    expect(res.body).toMatchObject({ id: id('t5'), cleared: true });
    expect((await api().patch(`/api/v1/transactions/${id('t5')}`).send({ cleared: 'yes' }).expect(400)).body.error.fields).toEqual({ cleared: 'Send cleared as true or false.' });
  });

  it('keeps activity in a closed period read-only', async () => {
    const res = await api().post('/api/v1/transactions').send({ kind: 'expense', date: '2026-09-15', description: 'Late', category: 'Other', accountId: id('chk'), amount: 100 }).expect(409);
    expect(res.body.error.code).toBe('period_closed');
  });
});
