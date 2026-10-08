import { describe, expect, it } from 'vitest';
import { useTestApi } from '../test/api.ts';

const { api, id } = useTestApi();
const payment = () => ({ date: '2026-10-07', accountId: id('chk'), amount: 128455, method: 'website', confirmation: null });
const statement = { statementDate: '2026-10-09', dueDate: '2026-10-28', servicePeriod: null, minimumDue: null, lines: [{ name: 'Gas', amount: 3922 }] };

describe('/api/v1/periods', () => {
  it('returns the checklist with progress for the current period', async () => {
    const res = await api().get('/api/v1/periods/2026-10').expect(200);
    expect(res.body).toMatchObject({ period: '2026-10', status: 'open', closedAt: null });
    expect(res.body.items.map((i: { billId: string }) => i.billId)).toEqual(['spectrum', 'amex', 'verizon', 'toyota', 'ladwp', 'sapphire', 'socal'].map(id));
    expect(res.body.items.find((i: { billId: string }) => i.billId === id('spectrum'))).toMatchObject({ status: 'paid', transactionId: id('t3'), accountId: id('chk') });
    expect(res.body.progress).toMatchObject({ billCount: 7, tasks: 10, tasksDone: 2, totalDue: 285921, paid: 69239, canLock: false });
    const items = await api().get('/api/v1/periods/2026-10/items').expect(200);
    expect(items.body).toEqual(res.body.items);
  });

  it('generates future periods and marks off-cycle bills', async () => {
    const res = await api().get('/api/v1/periods/2026-11').expect(200);
    expect(res.body.items.at(-1)).toMatchObject({ billId: id('ladwp'), status: 'offcycle', next: { statementDate: '2026-11-28', dueDate: '2026-12-19' } });
    expect(res.body.progress.billCount).toBe(6);
  });

  it('validates the period format', async () => {
    const res = await api().get('/api/v1/periods/2026-13').expect(400);
    expect(res.body.error.fields).toEqual({ period: 'Use the YYYY-MM format.' });
  });

  it('entering a statement moves awaiting → entered and stores each line', async () => {
    const res = await api().put(`/api/v1/periods/2026-10/items/${id('socal')}/statement`).send(statement).expect(200);
    expect(res.body).toMatchObject({ status: 'entered', amount: 3922, estimated: false, lines: statement.lines });
    const reread = await api().get('/api/v1/periods/2026-10');
    expect(reread.body.items.find((i: { billId: string }) => i.billId === id('socal')).status).toBe('entered');
  });

  it('schedules a payment', async () => {
    const res = await api().put(`/api/v1/periods/2026-10/items/${id('ladwp')}/schedule`).send(payment()).expect(200);
    expect(res.body).toMatchObject({ status: 'scheduled', scheduledDate: '2026-10-07', method: 'website' });
  });

  it('recording a payment marks the bill paid and adds a transaction to the paying account', async () => {
    const res = await api().put(`/api/v1/periods/2026-10/items/${id('sapphire')}/payment`).send(payment()).expect(200);
    expect(res.body).toMatchObject({ status: 'paid', paidDate: '2026-10-07', paidAmount: 128455, signedOff: true });
    const txs = await api().get(`/api/v1/transactions?accountId=${id('chk')}`).expect(200);
    expect(txs.body.find((t: { id: string }) => t.id === res.body.transactionId)).toMatchObject({
      amount: -128455, billId: id('sapphire'), billPeriod: '2026-10', kind: 'bill-payment', cleared: false, description: 'Chase Sapphire Preferred — payment',
    });

    const again = await api().put(`/api/v1/periods/2026-10/items/${id('sapphire')}/payment`).send({ ...payment(), amount: 100000 }).expect(200);
    expect(again.body.transactionId).toBe(res.body.transactionId);
    const linked = (await api().get('/api/v1/transactions')).body.filter((t: { billId: string }) => t.billId === id('sapphire'));
    expect(linked).toHaveLength(1);
    expect(linked[0].amount).toBe(-100000);
  });

  it('validates payments and reports unknown bills', async () => {
    const res = await api().put(`/api/v1/periods/2026-10/items/${id('sapphire')}/payment`).send({ ...payment(), amount: 0, date: '10/7' }).expect(400);
    expect(Object.keys(res.body.error.fields)).toEqual(['date', 'amount']);
    await api().put(`/api/v1/periods/2026-10/items/${id('chk')}/payment`).send(payment()).expect(404);
  });

  it('refuses to change off-cycle items', async () => {
    const res = await api().put(`/api/v1/periods/2026-11/items/${id('ladwp')}/schedule`).send(payment()).expect(409);
    expect(res.body.error.code).toBe('off_cycle');
  });

  it('refuses to lock a period with open items', async () => {
    expect((await api().post('/api/v1/periods/2026-10/close').expect(409)).body.error.code).toBe('close_incomplete');
  });

  it('keeps a closed period read-only until it is reopened, then locks it again', async () => {
    const closed = await api().get('/api/v1/periods/2026-09').expect(200);
    expect(closed.body).toMatchObject({ status: 'closed', closedAt: '2026-10-04', closedBy: 'Alex Rivera' });
    const res = await api().put(`/api/v1/periods/2026-09/items/${id('amex')}/statement`).send({ ...statement, dueDate: '2026-09-04' }).expect(409);
    expect(res.body.error.code).toBe('period_closed');

    expect((await api().post('/api/v1/periods/2026-09/reopen').expect(200)).body.status).toBe('open');
    const locked = await api().post('/api/v1/periods/2026-09/close').expect(200);
    expect(locked.body).toMatchObject({ status: 'closed', closedAt: '2026-10-07', closedBy: 'Alex Rivera' });
  });
});
