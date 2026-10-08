import { useState } from 'react';
import {
  Form,
  Link,
  redirect,
  useActionData,
  useFetcher,
  useFetchers,
  useLoaderData,
  useNavigation,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import { api, type Transaction } from '../../api';
import { isPeriod, periodEnd, periodStart } from '../../api/dates';
import { Field, FormError } from '../../components/Field';
import { centsToInput, formatDate, formatDay, formatMoney, formatPeriod, parseMoney } from '../../components/format';
import { Icon } from '../../components/Icon';
import { MoneyInput } from '../../components/MoneyInput';
import { Page } from '../../components/Page';
import { showToast } from '../../components/toast';
import { str, strOrNull, toActionError, type ActionResult } from '../helpers';

async function periodFrom(request: Request) {
  const requested = new URL(request.url).searchParams.get('period');
  return requested && isPeriod(requested) ? requested : (await api.session.get()).currentPeriod;
}

/** /reconcile → the first account. */
export async function indexLoader({ request }: LoaderFunctionArgs) {
  const [first] = await api.accounts.list();
  const search = new URL(request.url).search;
  return first ? redirect(`/reconcile/${first.id}${search}`) : redirect('/accounts');
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const period = await periodFrom(request);
  const accountId = params.accountId!;
  const [session, accounts, reconciliations, transactions, closePeriod] = await Promise.all([
    api.session.get(),
    api.accounts.list(),
    api.reconciliations.list(period),
    api.transactions.list({ accountId }),
    api.periods.get(period),
  ]);
  const account = accounts.find((a) => a.id === accountId);
  if (!account) throw new Response('Not found', { status: 404 });
  const start = periodStart(period);
  const end = periodEnd(period);
  // This period's activity, plus anything older that still hasn't cleared.
  const items = transactions
    .filter((t) => t.date <= end && (t.date >= start || !t.cleared))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id, undefined, { numeric: true }));
  return {
    session,
    period,
    periodClosed: closePeriod.status === 'closed',
    account,
    accounts,
    reconciliations,
    rec: reconciliations.find((r) => r.accountId === accountId)!,
    items,
  };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const period = await periodFrom(request);
  const accountId = params.accountId!;
  const form = await request.formData();
  const intent = str(form, 'intent');
  try {
    if (intent === 'toggle') {
      await api.transactions.setCleared(str(form, 'id'), str(form, 'cleared') === 'true');
      return { ok: true };
    }
    if (intent === 'balance' || intent === 'sign-off') {
      const text = str(form, 'bankBalance');
      await api.reconciliations.update(accountId, period, {
        bankBalance: text === '' ? null : (parseMoney(text) ?? Number.NaN),
        asOf: strOrNull(form, 'asOf'),
      });
    }
    if (intent === 'sign-off') {
      await api.reconciliations.signOff(accountId, period);
      showToast('Reconciliation signed off');
    }
    if (intent === 'reopen') {
      await api.reconciliations.reopen(accountId, period);
      showToast('Reconciliation reopened');
    }
  } catch (error) {
    return toActionError(error);
  }
  return { ok: true };
}

export default function Reconcile() {
  const data = useLoaderData<typeof loader>();
  // Remount per account and period so the bank balance field starts from saved data.
  return <ReconcileView key={`${data.account.id}/${data.period}`} {...data} />;
}

function ReconcileView({ session, period, periodClosed, account, accounts, reconciliations, rec, items }: Awaited<ReturnType<typeof loader>>) {
  const result = useActionData<ActionResult>();
  const navigation = useNavigation();
  const fetchers = useFetchers();
  const signed = rec.status === 'signed-off';
  const locked = signed || periodClosed;
  const [bankText, setBankText] = useState(centsToInput(rec.bankBalance));
  const query = period === session.currentPeriod ? '' : `?period=${period}`;

  // Apply in-flight "cleared" toggles so the totals update the moment a box is ticked.
  const pending = new Map<string, boolean>();
  for (const f of fetchers) {
    if (f.formData?.get('intent') === 'toggle') pending.set(String(f.formData.get('id')), f.formData.get('cleared') === 'true');
  }
  const rows = items.map((t) => (pending.has(t.id) ? { ...t, cleared: pending.get(t.id)! } : t));
  const inPeriod = (t: Transaction) => t.date >= periodStart(period);
  const sum = (ts: Transaction[]) => ts.reduce((s, t) => s + t.amount, 0);
  const clearedIn = sum(rows.filter((t) => t.cleared && inPeriod(t) && t.amount > 0));
  const clearedOut = sum(rows.filter((t) => t.cleared && inPeriod(t) && t.amount < 0));
  const opening = rec.summary.openingBalance;
  const clearedBalance = opening + clearedIn + clearedOut;
  const uncleared = rows.filter((t) => !t.cleared);
  const bank = parseMoney(bankText);
  const diff = bank == null ? null : bank - clearedBalance;
  const tone = diff === null ? 'none' : diff === 0 ? 'ok' : 'bad';

  return (
    <Page title="Reconcile" eyebrow={`${account.name} · ${formatPeriod(period)}`}>
      <nav className="acct-tabs" aria-label="Accounts">
        {accounts.map((a) => {
          const r = reconciliations.find((x) => x.accountId === a.id)!;
          const d = r.summary.difference;
          const label = r.status === 'signed-off' ? 'Signed off' : d === 0 ? 'Balanced' : d === null ? 'No bank balance' : `Off by ${formatMoney(Math.abs(d))}`;
          return (
            <Link key={a.id} to={`/reconcile/${a.id}${query}`} className={`acct-tab ${a.id === account.id ? 'active' : ''}`} aria-current={a.id === account.id ? 'page' : undefined}>
              <b>{a.name}</b>
              <span className={`num ${r.status === 'signed-off' || d === 0 ? 'good' : 'bad'}`}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <section className="rec">
        <div className="card">
          <div className="card-h">
            <h3>Balance check</h3>
            <span className="small muted">
              {account.type === 'checking' ? 'Checking' : 'Savings'} ••{account.last4}
            </span>
          </div>
          <Form method="post" id="rec-form" className="card-b rec-input">
            <FormError message={result?.formError} />
            <div className="grid2">
              <Field label="Bank balance" error={result?.errors?.bankBalance}>
                {(p) => (
                  <MoneyInput
                    {...p}
                    name="bankBalance"
                    value={bankText}
                    disabled={locked}
                    onChange={(e) => setBankText(e.target.value)}
                    onBlur={(e) => {
                      if (parseMoney(bankText) !== rec.bankBalance) e.currentTarget.form?.requestSubmit(document.getElementById('save-balance') as HTMLButtonElement);
                    }}
                  />
                )}
              </Field>
              <Field label="As of" error={result?.errors?.asOf}>
                {(p) => <input {...p} className="input" type="date" name="asOf" defaultValue={rec.asOf ?? session.today} disabled={locked} />}
              </Field>
            </div>
            <span className="hint">From your bank's website or statement: the posted (ledger) balance.</span>
            <button id="save-balance" type="submit" name="intent" value="balance" className="sr-only" tabIndex={-1} disabled={locked}>
              Save bank balance
            </button>
          </Form>
          <div className="recsum num">
            <div className="ln">
              <span>Opening balance · {formatDay(periodStart(period))}</span>
              <span>{formatMoney(opening)}</span>
            </div>
            <div className="ln sub">
              <span>+ Cleared deposits</span>
              <span>{formatMoney(clearedIn)}</span>
            </div>
            <div className="ln sub">
              <span>− Cleared payments &amp; expenses</span>
              <span>{formatMoney(clearedOut)}</span>
            </div>
            <div className="ln tot">
              <span>Cleared book balance</span>
              <span data-testid="cleared-balance">{formatMoney(clearedBalance)}</span>
            </div>
            <div className="ln sub">
              <span>Uncleared items ({uncleared.length})</span>
              <span>{formatMoney(sum(uncleared))}</span>
            </div>
            <div className="ln proj">
              <span>Projected book balance</span>
              <span>{formatMoney(rec.summary.bookBalance)}</span>
            </div>
          </div>
          <div className={`diff ${tone}`} role="status" aria-live="polite">
            <span className="eyebrow">Difference · bank − cleared book</span>
            <span className="v num" data-testid="difference">
              {diff === null ? '—' : formatMoney(diff)}
            </span>
            <span className="small">
              {signed
                ? `Reconciled and signed off by ${rec.signedOffBy} on ${rec.signedOffAt ? formatDay(rec.signedOffAt) : ''}.`
                : diff === null
                  ? 'Enter the bank balance to start.'
                  : diff === 0
                    ? 'Balanced. Sign off to complete this reconciliation.'
                    : "Tick each item that has posted at your bank. If it still doesn't balance, look for a missing or mistyped entry."}
            </span>
          </div>
          <div className="df flush">
            {periodClosed ? (
              <span className="small muted">This period is closed.</span>
            ) : signed ? (
              <Form method="post">
                <button className="btn" name="intent" value="reopen">
                  Reopen
                </button>
              </Form>
            ) : (
              <button type="submit" form="rec-form" name="intent" value="sign-off" className="btn primary" disabled={diff !== 0 || navigation.state === 'submitting'}>
                <Icon name="check" /> Sign off reconciliation
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Mark cleared items</h3>
            <span className="small muted">Items that have posted at the bank by {formatDate(rec.asOf ?? session.today)}</span>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44 }}>
                    <span className="sr-only">Cleared</span>
                  </th>
                  <th>Date</th>
                  <th>Description</th>
                  <th className="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <ClearRow key={t.id} t={t} locked={locked} />
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty">
                      No {formatPeriod(period)} activity in this account. Enter the bank balance; it should equal the opening balance.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="card-b ruled">
            <Link className="btn sm" to={`/activity?account=${account.id}`}>
              <Icon name="plus" /> Add a missing entry
            </Link>
          </div>
        </div>
      </section>
    </Page>
  );
}

function ClearRow({ t, locked }: { t: Transaction; locked: boolean }) {
  const fetcher = useFetcher();
  const id = `clr-${t.id}`;
  return (
    <tr>
      <td>
        <input
          type="checkbox"
          className="chk"
          id={id}
          checked={t.cleared}
          disabled={locked}
          aria-label={`Cleared: ${t.description}`}
          onChange={(e) => fetcher.submit({ intent: 'toggle', id: t.id, cleared: String(e.target.checked) }, { method: 'post' })}
        />
      </td>
      <td className="num">{formatDay(t.date)}</td>
      <td>
        <label htmlFor={id} className="clear-label">
          <b>{t.description}</b>
          <div className="small muted">{t.category}</div>
        </label>
      </td>
      <td className="r num strong">
        <span className={t.amount > 0 ? 'amt-pos' : ''}>{formatMoney(t.amount, { sign: true })}</span>
      </td>
    </tr>
  );
}
