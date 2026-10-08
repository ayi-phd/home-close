import { Link, useActionData, useFetcher, useLoaderData, useNavigation, useSearchParams, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { api, type Account, type Bill, type Transaction } from '../../api';
import { isPeriod, periodOf } from '../../api/dates';
import { formatAccount, formatDay, formatMoney, formatPeriod, monthName } from '../../components/format';
import { Kpi, KpiRow } from '../../components/Kpi';
import { Page } from '../../components/Page';
import { SegLinks } from '../../components/Seg';
import { TransactionForm } from '../../components/TransactionForm';
import { showToast } from '../../components/toast';
import { parseTransactionForm, str, toActionError, type ActionResult } from '../helpers';

export async function loader({ request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams;
  const session = await api.session.get();
  const requested = search.get('period');
  const period = requested && isPeriod(requested) ? requested : session.currentPeriod;
  const accountId = search.get('account') ?? undefined;
  const [accounts, bills, transactions, reconciliations, closePeriod] = await Promise.all([
    api.accounts.list(),
    api.bills.list(),
    api.transactions.list({ period, accountId }),
    api.reconciliations.list(period),
    api.periods.get(period),
  ]);
  // Activity is read-only once the period is closed or the account is signed off.
  const lockedAccounts = closePeriod.status === 'closed' ? accounts.map((a) => a.id) : reconciliations.filter((r) => r.status === 'signed-off').map((r) => r.accountId);
  return { session, period, accountId: accountId ?? null, accounts, bills, transactions, lockedAccounts };
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  try {
    if (str(form, 'intent') === 'toggle') {
      await api.transactions.setCleared(str(form, 'id'), str(form, 'cleared') === 'true');
      return { ok: true };
    }
    const created = await api.transactions.create(parseTransactionForm(form));
    showToast('Entry added · mark it cleared when it posts');
    return { ok: true, created: created[0]!.id };
  } catch (error) {
    return toActionError(error);
  }
}

export default function Activity() {
  const { session, period, accountId, accounts, bills, transactions, lockedAccounts } = useLoaderData<typeof loader>();
  const result = useActionData<ActionResult & { created?: string }>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const nonTransfer = transactions.filter((t) => t.kind !== 'transfer');
  const moneyIn = nonTransfer.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const moneyOut = nonTransfer.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const billPayments = transactions.filter((t) => t.billId).reduce((s, t) => s + t.amount, 0);
  const link = (account: string | null) => {
    const next = new URLSearchParams(params);
    if (account) next.set('account', account);
    else next.delete('account');
    const query = next.toString();
    return `/activity${query ? `?${query}` : ''}`;
  };

  return (
    <Page
      title="Expenses & payments"
      eyebrow={formatPeriod(period)}
      actions={
        <Link className="btn" to={accountId ? `/reconcile/${accountId}` : '/reconcile'}>
          Reconcile
        </Link>
      }
    >
      <div className="filters">
        <SegLinks
          label="Filter by account"
          options={[
            { to: link(null), label: 'All accounts', active: accountId === null },
            ...accounts.map((a) => ({ to: link(a.id), label: formatAccount(a), active: accountId === a.id })),
          ]}
        />
        <span className="small muted">{formatPeriod(period)}</span>
      </div>

      <KpiRow label="Activity totals">
        <Kpi label="Money in" value={formatMoney(moneyIn)} tone="good" sub="Excludes transfers" />
        <Kpi label="Money out" value={formatMoney(moneyOut)} sub="Bills and everyday expenses" />
        <Kpi label="Bill payments" value={formatMoney(billPayments)} sub="Linked to the close checklist" />
        <Kpi label="Not yet cleared" value={transactions.filter((t) => !t.cleared).length} sub="Waiting to post at the bank" />
      </KpiRow>

      <section className="card">
        <div className="card-h">
          <h3>Quick add</h3>
          <span className="small muted">Expenses, deposits and transfers you want to reconcile</span>
        </div>
        <TransactionForm
          key={`${accountId ?? 'all'}/${result?.created ?? 'new'}`}
          id="quick-add"
          layout="inline"
          accounts={accounts}
          defaultAccountId={accountId ?? undefined}
          today={periodOf(session.today) === period ? session.today : `${period}-01`}
          errors={result?.errors}
          formError={result?.formError}
          busy={navigation.state === 'submitting'}
        />
      </section>

      <section className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Account</th>
                <th className="r">Amount</th>
                <th className="c">Cleared</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <ActivityRow
                  key={t.id}
                  t={t}
                  account={accounts.find((a) => a.id === t.accountId)}
                  bill={bills.find((b) => b.id === t.billId)}
                  locked={lockedAccounts.includes(t.accountId)}
                />
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No activity yet for this account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Page>
  );
}

function ActivityRow({ t, account, bill, locked }: { t: Transaction; account?: Account; bill?: Bill; locked: boolean }) {
  const fetcher = useFetcher();
  const cleared = fetcher.formData ? fetcher.formData.get('cleared') === 'true' : t.cleared;
  const id = `act-clr-${t.id}`;
  return (
    <tr>
      <td className="num">{formatDay(t.date)}</td>
      <td>
        <b>{t.description}</b>
        {bill && t.billPeriod && (
          <div className="small linked">
            Linked to {bill.name} · {monthName(t.billPeriod)} close
          </div>
        )}
      </td>
      <td>
        <span className="chip">{t.category}</span>
      </td>
      <td className="small">{account && formatAccount(account)}</td>
      <td className="r num">
        <span className={t.amount > 0 ? 'amt-pos' : ''}>{formatMoney(t.amount, { sign: true })}</span>
      </td>
      <td className="c">
        <input
          type="checkbox"
          className="chk"
          id={id}
          checked={cleared}
          disabled={locked}
          aria-label={`Cleared: ${t.description}`}
          onChange={(e) => fetcher.submit({ intent: 'toggle', id: t.id, cleared: String(e.target.checked) }, { method: 'post' })}
        />
      </td>
    </tr>
  );
}
