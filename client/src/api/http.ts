/**
 * HomeCloseApi over HTTP. Each method maps to one `/api/v1` endpoint; error responses become
 * ApiError so route actions handle them the same way as the mock's errors.
 */
import { ApiError, type ApiErrorBody, type HomeCloseApi } from './types';

type Fetch = typeof fetch;
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const seg = encodeURIComponent;

function isErrorBody(value: unknown): value is { error: ApiErrorBody } {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return typeof error === 'object' && error !== null && typeof (error as ApiErrorBody).code === 'string';
}

export function createHttpApi(baseUrl: string, fetchImpl: Fetch = (...args) => fetch(...args)): HomeCloseApi {
  const root = baseUrl.replace(/\/+$/, '');

  async function call<T>(method: Method, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(`${root}${path}`, {
        method,
        headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
      });
    } catch {
      throw new ApiError(0, { code: 'network_error', message: "Can't reach the Home Close server. Check that it's running." });
    }
    if (res.status === 204) return undefined as T;
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, isErrorBody(payload) ? payload.error : { code: 'http_error', message: `The server responded with ${res.status}.` });
    }
    return payload as T;
  }

  const query = (params: Record<string, string | undefined>) => {
    const search = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString();
    return search ? `?${search}` : '';
  };

  return {
    session: {
      get: () => call('GET', '/session'),
      login: (input) => call('POST', '/session', input),
      signup: (input) => call('POST', '/households', input),
      logout: () => call('DELETE', '/session'),
    },
    accounts: {
      list: () => call('GET', '/accounts'),
      get: (id) => call('GET', `/accounts/${seg(id)}`),
      create: (input) => call('POST', '/accounts', input),
      update: (id, input) => call('PUT', `/accounts/${seg(id)}`, input),
    },
    bills: {
      list: () => call('GET', '/bills'),
      get: (id) => call('GET', `/bills/${seg(id)}`),
      create: (input) => call('POST', '/bills', input),
      update: (id, input) => call('PUT', `/bills/${seg(id)}`, input),
    },
    periods: {
      get: (period) => call('GET', `/periods/${seg(period)}`),
      saveStatement: (period, billId, input) => call('PUT', `/periods/${seg(period)}/items/${seg(billId)}/statement`, input),
      schedulePayment: (period, billId, input) => call('PUT', `/periods/${seg(period)}/items/${seg(billId)}/schedule`, input),
      recordPayment: (period, billId, input) => call('PUT', `/periods/${seg(period)}/items/${seg(billId)}/payment`, input),
      close: (period) => call('POST', `/periods/${seg(period)}/close`),
      reopen: (period) => call('POST', `/periods/${seg(period)}/reopen`),
    },
    transactions: {
      list: (filter = {}) => call('GET', `/transactions${query({ accountId: filter.accountId, period: filter.period })}`),
      create: (input) => call('POST', '/transactions', input),
      setCleared: (id, cleared) => call('PATCH', `/transactions/${seg(id)}`, { cleared }),
    },
    reconciliations: {
      list: (period) => call('GET', `/reconciliations${query({ period })}`),
      get: (accountId, period) => call('GET', `/reconciliations/${seg(accountId)}/${seg(period)}`),
      update: (accountId, period, input) => call('PUT', `/reconciliations/${seg(accountId)}/${seg(period)}`, input),
      signOff: (accountId, period) => call('POST', `/reconciliations/${seg(accountId)}/${seg(period)}/sign-off`),
      reopen: (accountId, period) => call('POST', `/reconciliations/${seg(accountId)}/${seg(period)}/reopen`),
    },
  };
}
