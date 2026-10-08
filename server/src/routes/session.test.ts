import { describe, expect, it } from 'vitest';
import { TODAY, useTestApi } from '../test/api.ts';

const { api } = useTestApi();

describe('session (v0 stub)', () => {
  it('returns the household session with the server date', async () => {
    const res = await api().get('/api/v1/session').expect(200);
    expect(res.body).toEqual({
      user: { firstName: 'Alex', lastName: 'Rivera', email: 'alex.rivera@example.com' },
      household: { name: 'Rivera Household', startPeriod: '2026-09' },
      today: TODAY,
      currentPeriod: '2026-10',
    });
  });

  it('signs in with any input', async () => {
    const res = await api().post('/api/v1/session').send({}).expect(201);
    expect(res.body.user.firstName).toBe('Alex');
    await api().delete('/api/v1/session').expect(204);
  });

  it('sign-up applies the non-empty fields', async () => {
    const res = await api().post('/api/v1/households').send({ firstName: 'Sam', lastName: '', householdName: 'Lee Household', startPeriod: 'bad' }).expect(201);
    expect(res.body.user).toMatchObject({ firstName: 'Sam', lastName: 'Rivera' });
    expect(res.body.household).toEqual({ name: 'Lee Household', startPeriod: '2026-09' });
  });
});
