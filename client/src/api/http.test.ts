import { describe, expect, it, vi } from 'vitest';
import { createHttpApi } from './http';
import { ApiError } from './types';

function fakeFetch(status = 200, body: unknown = {}) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

const payment = { date: '2026-10-07', accountId: 'a1', amount: 100, method: 'website' as const, confirmation: null };

describe('createHttpApi', () => {
  it.each([
    ['session.get', (api: ReturnType<typeof createHttpApi>) => api.session.get(), 'GET', '/api/v1/session', undefined],
    ['accounts.update', (api: ReturnType<typeof createHttpApi>) => api.accounts.update('a1', { name: 'n', institution: 'i', type: 'checking', last4: '1234', openingBalance: 1, openingDate: '2026-10-01' }), 'PUT', '/api/v1/accounts/a1', { name: 'n' }],
    ['bills.get', (api: ReturnType<typeof createHttpApi>) => api.bills.get('b 1'), 'GET', '/api/v1/bills/b%201', undefined],
    ['periods.recordPayment', (api: ReturnType<typeof createHttpApi>) => api.periods.recordPayment('2026-10', 'b1', payment), 'PUT', '/api/v1/periods/2026-10/items/b1/payment', payment],
    ['periods.close', (api: ReturnType<typeof createHttpApi>) => api.periods.close('2026-10'), 'POST', '/api/v1/periods/2026-10/close', undefined],
    ['transactions.list', (api: ReturnType<typeof createHttpApi>) => api.transactions.list({ accountId: 'a1', period: '2026-10' }), 'GET', '/api/v1/transactions?accountId=a1&period=2026-10', undefined],
    ['transactions.list (no filter)', (api: ReturnType<typeof createHttpApi>) => api.transactions.list(), 'GET', '/api/v1/transactions', undefined],
    ['transactions.setCleared', (api: ReturnType<typeof createHttpApi>) => api.transactions.setCleared('t1', true), 'PATCH', '/api/v1/transactions/t1', { cleared: true }],
    ['reconciliations.list', (api: ReturnType<typeof createHttpApi>) => api.reconciliations.list('2026-10'), 'GET', '/api/v1/reconciliations?period=2026-10', undefined],
    ['reconciliations.signOff', (api: ReturnType<typeof createHttpApi>) => api.reconciliations.signOff('a1', '2026-10'), 'POST', '/api/v1/reconciliations/a1/2026-10/sign-off', undefined],
  ])('%s → %s %s', async (_name, run, method, url, body) => {
    const fetchImpl = fakeFetch();
    await run(createHttpApi('/api/v1/', fetchImpl));
    const [calledUrl, init] = fetchImpl.mock.calls[0]!;
    expect(calledUrl).toBe(url);
    expect(init?.method).toBe(method);
    if (body === undefined) expect(init?.body).toBeUndefined();
    else expect(JSON.parse(String(init?.body))).toMatchObject(body);
  });

  it('returns the parsed JSON body', async () => {
    const api = createHttpApi('/api/v1', fakeFetch(200, [{ id: 'a1' }]));
    await expect(api.accounts.list()).resolves.toEqual([{ id: 'a1' }]);
  });

  it('handles 204 No Content', async () => {
    await expect(createHttpApi('/api/v1', fakeFetch(204)).session.logout()).resolves.toBeUndefined();
  });

  it('turns the API error shape into ApiError with field errors', async () => {
    const api = createHttpApi('/api/v1', fakeFetch(400, { error: { code: 'validation_failed', message: 'Some fields need attention.', fields: { last4: 'Enter the last 4 digits.' } } }));
    const error = await api.accounts.create({ name: 'n', institution: 'i', type: 'checking', last4: '1', openingBalance: 0, openingDate: '2026-10-01' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'validation_failed', fields: { last4: 'Enter the last 4 digits.' } });
  });

  it('reports non-JSON failures and network errors', async () => {
    const html = vi.fn(async () => new Response('<h1>Bad gateway</h1>', { status: 502 }));
    await expect(createHttpApi('/api/v1', html).bills.list()).rejects.toMatchObject({ status: 502, code: 'http_error' });
    const down = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(createHttpApi('/api/v1', down).bills.list()).rejects.toMatchObject({ status: 0, code: 'network_error' });
  });
});
