import { describe, expect, it } from 'vitest';
import { useTestApi } from '../test/api.ts';

const { api, id } = useTestApi();

describe('/api/v1/bills', () => {
  it('lists bills in fixture order with ids for the paying account', async () => {
    const res = await api().get('/api/v1/bills').expect(200);
    expect(res.body).toHaveLength(7);
    expect(res.body[0]).toEqual({
      id: id('ladwp'),
      name: 'LADWP',
      category: 'utilities',
      lines: ['Electricity', 'Water', 'Trash pickup'],
      frequency: 'bimonthly',
      cycleAnchorMonth: 1,
      statementDay: 28,
      dueRule: { kind: 'days-after-statement', days: 21 },
      amountType: 'varies',
      typicalAmount: 28000,
      accountId: id('chk'),
      autopay: false,
      reference: '4471',
      defaultPayment: null,
      loan: null,
      color: '#00539B',
      initials: 'DWP',
    });
    expect(res.body.find((b: { name: string }) => b.name === 'Toyota Financial').loan).toEqual({ balance: 948612, paymentsLeft: 23, aprBps: null });
  });

  it('creates a multi-service bill and normalizes category-specific fields', async () => {
    const res = await api()
      .post('/api/v1/bills')
      .send({
        name: 'City of Glendale', category: 'utilities', lines: ['Water', 'Sewer'], frequency: 'monthly', cycleAnchorMonth: 2,
        statementDay: 12, dueRule: { kind: 'days-after-statement', days: 25 }, amountType: 'varies', typicalAmount: 9640,
        accountId: id('chk'), autopay: false, reference: '', defaultPayment: 'minimum', loan: { balance: 1, paymentsLeft: 1, aprBps: null },
      })
      .expect(201);
    expect(res.body).toMatchObject({ initials: 'CIT', cycleAnchorMonth: null, defaultPayment: null, loan: null });
    // It joins the close checklist for the months it is due.
    const october = await api().get('/api/v1/periods/2026-10').expect(200);
    expect(october.body.items.find((i: { billId: string }) => i.billId === res.body.id)).toMatchObject({
      status: 'awaiting', statementDate: '2026-09-12', dueDate: '2026-10-07',
    });
  });

  it('updates a bill', async () => {
    const bill = (await api().get(`/api/v1/bills/${id('ladwp')}`).expect(200)).body;
    const { id: _id, color: _c, initials: _i, ...input } = bill;
    const res = await api().put(`/api/v1/bills/${id('ladwp')}`).send({ ...input, lines: [...bill.lines, 'Sewer'], autopay: true }).expect(200);
    expect(res.body).toMatchObject({ lines: ['Electricity', 'Water', 'Trash pickup', 'Sewer'], autopay: true, color: '#00539B' });
  });

  it('validates rules across fields', async () => {
    const res = await api()
      .post('/api/v1/bills')
      .send({ category: 'utilities', lines: [], frequency: 'quarterly', statementDay: null, dueRule: { kind: 'days-after-statement', days: 200 }, amountType: 'fixed', typicalAmount: -1, accountId: 'x', autopay: 'yes' })
      .expect(400);
    expect(res.body.error.fields).toEqual({
      name: 'Enter the biller name.',
      lines: 'Pick at least one service.',
      cycleAnchorMonth: 'Choose which months it is billed in.',
      statementDay: 'Enter a statement day from 1 to 31.',
      dueRule: 'Enter 1 to 90 days.',
      typicalAmount: 'Enter an amount of $0.00 or more.',
      accountId: 'Choose an account.',
      autopay: 'Say whether autopay is on.',
    });
  });

  it('rejects a paying account from outside the household', async () => {
    const bill = (await api().get(`/api/v1/bills/${id('socal')}`)).body;
    const { id: _id, color: _c, initials: _i, ...input } = bill;
    const res = await api().put(`/api/v1/bills/${id('socal')}`).send({ ...input, accountId: '0123456789abcdef01234567' }).expect(400);
    expect(res.body.error.fields).toEqual({ accountId: 'Choose an account.' });
  });
});
