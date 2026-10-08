import { describe, expect, it } from 'vitest';
import { useTestApi } from '../test/api.ts';

const { api, id } = useTestApi();
const input = { name: 'Joint Checking', institution: 'Bank of America', type: 'checking', last4: '4410', openingBalance: 125000, openingDate: '2026-10-01' };

describe('/api/v1/accounts', () => {
  it('lists accounts with derived balances and last reconciled date', async () => {
    const res = await api().get('/api/v1/accounts').expect(200);
    expect(res.body.map((a: { name: string }) => a.name)).toEqual(['Chase Total Checking', 'Wells Fargo Everyday', 'Ally Online Savings']);
    expect(res.body[0]).toEqual({
      id: id('chk'),
      name: 'Chase Total Checking',
      institution: 'Chase',
      type: 'checking',
      last4: '8812',
      openingBalance: 642018,
      openingDate: '2026-10-01',
      role: 'Primary · bills & groceries',
      color: '#117ACA',
      balances: { book: 772797, cleared: 807779, unclearedCount: 3 },
      lastReconciled: '2026-09-30',
    });
  });

  it('creates and updates an account', async () => {
    const created = await api().post('/api/v1/accounts').send(input).expect(201);
    expect(created.body).toMatchObject({ ...input, role: 'Checking', balances: { book: 125000, cleared: 125000, unclearedCount: 0 }, lastReconciled: null });
    const updated = await api().put(`/api/v1/accounts/${created.body.id}`).send({ ...input, name: 'Joint' }).expect(200);
    expect(updated.body.name).toBe('Joint');
    await api().get(`/api/v1/accounts/${created.body.id}`).expect(200);
  });

  it('returns every field error at once', async () => {
    const res = await api().post('/api/v1/accounts').send({ type: 'brokerage', last4: '12', openingBalance: 12.5, openingDate: '10/01/2026' }).expect(400);
    expect(Object.keys(res.body.error.fields)).toEqual(['name', 'institution', 'type', 'last4', 'openingBalance', 'openingDate']);
  });

  it('requires a JSON object body', async () => {
    const res = await api().post('/api/v1/accounts').send([input]).expect(400);
    expect(res.body.error.fields).toEqual({ body: 'Send a JSON object.' });
  });
});
