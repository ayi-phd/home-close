import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { AccountModel } from '../models/account.ts';
import { Household } from '../models/household.ts';
import { clearDatabase } from '../seed/seed.ts';
import { useTestApi } from '../test/api.ts';

const { api, id } = useTestApi();

describe('app', () => {
  it('reports health', async () => {
    await api().get('/healthz').expect(200, { status: 'ok' });
  });

  it('returns the shared error shape for unknown routes', async () => {
    const res = await api().get('/api/v1/nope').expect(404);
    expect(res.body).toEqual({ error: { code: 'not_found', message: 'Route not found.' } });
  });

  it('rejects malformed JSON with a 400 and no stack trace', async () => {
    const res = await api().post('/api/v1/accounts').set('Content-Type', 'application/json').send('{"name":').expect(400);
    expect(res.body).toEqual({ error: { code: 'validation_failed', message: 'Some fields need attention.', fields: { body: 'Send valid JSON.' } } });
  });

  it('returns 401 when there is no household to act as', async () => {
    await clearDatabase();
    const res = await api().get('/api/v1/accounts').expect(401);
    expect(res.body.error.code).toBe('unauthenticated');
  });

  it("scopes every query to the session's household", async () => {
    const other = await Household.create({ name: 'Other', startPeriod: '2026-10', user: { firstName: 'O', lastName: 'T', email: 'o@example.com' } });
    const foreign = await AccountModel.create({
      householdId: other._id, name: 'Foreign', institution: 'X', type: 'checking', last4: '0000', openingBalance: 1, openingDate: '2026-10-01', color: '#000',
    });
    const list = await api().get('/api/v1/accounts').expect(200);
    expect(list.body.map((a: { name: string }) => a.name)).not.toContain('Foreign');
    await api().get(`/api/v1/accounts/${foreign._id}`).expect(404);
    await api().put(`/api/v1/accounts/${foreign._id}`).send({ name: 'x', institution: 'y', type: 'checking', last4: '1111', openingBalance: 0, openingDate: '2026-10-01' }).expect(404);
    // A householdId sent by the client is ignored.
    const created = await api()
      .post('/api/v1/accounts')
      .send({ householdId: other._id, name: 'Mine', institution: 'Bank', type: 'checking', last4: '2222', openingBalance: 0, openingDate: '2026-10-01' })
      .expect(201);
    expect((await AccountModel.findById(created.body.id).lean())!.householdId.equals(other._id)).toBe(false);
    expect(id('chk')).toMatch(/^[0-9a-f]{24}$/);
  });

  it('treats malformed ids as not found', async () => {
    await api().get('/api/v1/bills/not-an-id').expect(404);
    await api().get(`/api/v1/bills/${new Types.ObjectId()}`).expect(404);
  });
});
