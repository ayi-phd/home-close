import { describe, expect, it } from 'vitest';
import { useTestApi } from '../test/api.ts';

const { api, id } = useTestApi();

describe('/api/v1/reconciliations', () => {
  it('lists every account for a period with its summary', async () => {
    const res = await api().get('/api/v1/reconciliations?period=2026-10').expect(200);
    expect(res.body.map((r: { accountId: string }) => r.accountId)).toEqual([id('chk'), id('wf'), id('ally')]);
    expect(res.body[0]).toEqual({
      accountId: id('chk'),
      period: '2026-10',
      bankBalance: 799352,
      asOf: '2026-10-07',
      status: 'open',
      signedOffAt: null,
      signedOffBy: null,
      summary: {
        openingBalance: 642018,
        clearedDeposits: 385000,
        clearedWithdrawals: -219239,
        clearedBalance: 807779,
        unclearedCount: 3,
        unclearedTotal: -34982,
        bookBalance: 772797,
        difference: -8427,
      },
    });
    expect((await api().get('/api/v1/reconciliations').expect(400)).body.error.fields).toEqual({ period: 'Use the YYYY-MM format.' });
  });

  it('defaults to an open reconciliation with no bank balance', async () => {
    const res = await api().get(`/api/v1/reconciliations/${id('chk')}/2026-11`).expect(200);
    expect(res.body).toMatchObject({ status: 'open', bankBalance: null, summary: { openingBalance: 807779, difference: null } });
  });

  it('updates the bank balance', async () => {
    const res = await api().put(`/api/v1/reconciliations/${id('wf')}/2026-10`).send({ bankBalance: 340000, asOf: '2026-10-07' }).expect(200);
    expect(res.body.summary.difference).toBe(-5655);
    expect((await api().put(`/api/v1/reconciliations/${id('wf')}/2026-10`).send({ bankBalance: 3400.5 }).expect(400)).body.error.fields).toEqual({ bankBalance: 'Enter the bank balance.' });
  });

  it('allows sign-off only at a $0.00 difference and locks the account until reopened', async () => {
    const refused = await api().post(`/api/v1/reconciliations/${id('chk')}/2026-10/sign-off`).expect(409);
    expect(refused.body.error.code).toBe('not_balanced');

    await api().patch(`/api/v1/transactions/${id('t5')}`).send({ cleared: true }).expect(200);
    const signed = await api().post(`/api/v1/reconciliations/${id('chk')}/2026-10/sign-off`).expect(200);
    expect(signed.body).toMatchObject({ status: 'signed-off', signedOffAt: '2026-10-07', signedOffBy: 'Alex Rivera', summary: { difference: 0 } });
    expect((await api().get(`/api/v1/accounts/${id('chk')}`)).body.lastReconciled).toBe('2026-10-07');

    expect((await api().patch(`/api/v1/transactions/${id('t6')}`).send({ cleared: true }).expect(409)).body.error.code).toBe('reconciliation_signed_off');
    expect((await api().put(`/api/v1/reconciliations/${id('chk')}/2026-10`).send({ bankBalance: 1, asOf: null }).expect(409)).body.error.code).toBe('reconciliation_signed_off');

    await api().post(`/api/v1/reconciliations/${id('chk')}/2026-10/reopen`).expect(200);
    await api().patch(`/api/v1/transactions/${id('t6')}`).send({ cleared: true }).expect(200);
  });

  it('reports unknown accounts', async () => {
    await api().get('/api/v1/reconciliations/0123456789abcdef01234567/2026-10').expect(404);
  });
});
