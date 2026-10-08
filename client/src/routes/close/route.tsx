import type { ReactNode } from 'react';
import { Form, Link, Outlet, redirect, useActionData, useLoaderData, useNavigate, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { api, type Account, type Bill, type CloseItem, type Reconciliation, type Transaction } from '../../api';
import { addMonths, daysInMonth, parsePeriod } from '../../api/dates';
import { BillerLogo, bankInitials } from '../../components/BillerLogo';
import { FormError } from '../../components/Field';
import { formatAccount, formatDay, formatMoney, formatPeriod, initials, monthName } from '../../components/format';
import { Icon } from '../../components/Icon';
import { Kpi, KpiRow } from '../../components/Kpi';
import { ClearedMark, SignoffMark } from '../../components/Marks';
import { Page } from '../../components/Page';
import { SegLinks } from '../../components/Seg';
import { Pill, StatusPill } from '../../components/StatusPill';
import { showToast } from '../../components/toast';
import { requirePeriodParam, str, toActionError, type ActionResult } from '../helpers';

/** /close → the household's current period. */
export async function indexLoader() {
  const { currentPeriod } = await api.session.get();
  return redirect(`/close/${currentPeriod}`);
}

export async function loader({ params }: LoaderFunctionArgs) {
  const periodId = requirePeriodParam(params.period);
  const session = await api.session.get();
  const tabs = [addMonths(session.currentPeriod, -1), session.currentPeriod, addMonths(session.currentPeriod, 1)];
  const [period, bills, accounts, transactions, reconciliations, tabPeriods] = await Promise.all([
    api.periods.get(periodId),
    api.bills.list(),
    api.accounts.list(),
    api.transactions.list(),
    api.reconciliations.list(periodId),
    Promise.all(tabs.map((p) => api.periods.get(p))),
  ]);
  return {
    session,
    period,
    bills,
    accounts,
    transactions,
    reconciliations,
    tabs: tabPeriods.map((p) => ({ period: p.period, closed: p.status === 'closed' })),
  };
}

export type CloseLoaderData = Awaited<ReturnType<typeof loader>>;

export async function action({ request, params }: ActionFunctionArgs) {
  const period = requirePeriodParam(params.period);
  const intent = str(await request.formData(), 'intent');
  try {
    if (intent === 'lock') {
      await api.periods.close(period);
      showToast(`${formatPeriod(period)} locked`);
    } else if (intent === 'reopen') {
      await api.periods.reopen(period);
      showToast(`${formatPeriod(period)} reopened`);
    }
  } catch (error) {
    return toActionError(error);
  }
  return null;
}

export default function Close() {
  const { session, period, bills, accounts, transactions, reconciliations, tabs } = useLoaderData<typeof loader>();
  const result = useActionData<ActionResult>();
  const closed = period.status === 'closed';
  const { progress } = period;
  const { year, month } = parsePeriod(period.period);
  const signer = initials(session.user.firstName, session.user.lastName);
  const bill = (id: string) => bills.find((b) => b.id === id)!;
  const account = (id: string) => accounts.find((a) => a.id === id);

  const note = closed ? (
    <span className="lock-note">
      <Icon name="lock" /> Closed {period.closedAt && formatDay(period.closedAt)} · signed off by {period.closedBy}
    </span>
  ) : period.period > session.currentPeriod ? (
    'Upcoming period · amounts are estimates until statements arrive'
  ) : (
    `Bills due ${formatDay(`${period.period}-01`)}–${daysInMonth(year, month)} · select a bill to enter a statement or payment`
  );

  return (
    <Page
      title="Monthly close"
      eyebrow={formatPeriod(period.period)}
      actions={
        <>
          <Link className="btn" to="/bills">
            Manage bills
          </Link>
          <Form method="post">
            {closed ? (
              <button className="btn" name="intent" value="reopen">
                Reopen period
              </button>
            ) : (
              <button
                className="btn primary"
                name="intent"
                value="lock"
                disabled={!progress.canLock}
                title="Available when every bill is paid and every account is reconciled"
              >
                <Icon name="lock" /> Lock period
              </button>
            )}
          </Form>
        </>
      }
    >
      <FormError message={result?.formError} />
      <div className="filters">
        <SegLinks
          label="Period"
          options={tabs.map((t) => ({
            to: `/close/${t.period}`,
            label: `${monthName(t.period)}${t.closed ? ' ✓' : ''}`,
            active: t.period === period.period,
          }))}
        />
        <span className="small muted">{note}</span>
      </div>

      <KpiRow label="Period totals">
        <Kpi
          label="Total due"
          value={formatMoney(progress.totalDue)}
          sub={`${progress.billCount} bills${progress.offCycleCount ? ` · ${progress.offCycleCount} off-cycle` : ''}`}
        />
        <Kpi label="Paid" value={formatMoney(progress.paid)} tone="good" meter={progress.totalDue ? progress.paid / progress.totalDue : 0} />
        <Kpi label="Remaining" value={formatMoney(progress.remaining)} sub={`${progress.billCount - progress.byStatus.paid} open items`} />
        <Kpi label="Awaiting statements" value={progress.byStatus.awaiting} sub="Estimated from typical amounts" />
      </KpiRow>

      <section className="card">
        <div className="card-h">
          <h3>Close checklist · {formatPeriod(period.period)}</h3>
          <span className="small muted">Statement → Pay → Clear → Sign off</span>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Bill</th>
                <th>Statement</th>
                <th>Due</th>
                <th className="r">Amount</th>
                <th>Status</th>
                <th>Pay from</th>
                <th className="c">Cleared</th>
                <th className="c">Sign-off</th>
              </tr>
            </thead>
            <tbody>
              <tr className="group">
                <td colSpan={8}>Bills</td>
              </tr>
              {period.items.map((item) => (
                <BillRow
                  key={item.billId}
                  item={item}
                  bill={bill(item.billId)}
                  account={account(item.accountId)}
                  transaction={transactions.find((t) => t.id === item.transactionId)}
                  closed={closed}
                  signer={signer}
                />
              ))}
              <tr className="group">
                <td colSpan={8}>Account reconciliations</td>
              </tr>
              {accounts.map((a) => (
                <ReconcileRow key={a.id} account={a} rec={reconciliations.find((r) => r.accountId === a.id)!} period={period.period} signer={signer} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Outlet />
    </Page>
  );
}

function BillRow({
  item,
  bill,
  account,
  transaction,
  closed,
  signer,
}: {
  item: CloseItem;
  bill: Bill;
  account?: Account;
  transaction?: Transaction;
  closed: boolean;
  signer: string;
}) {
  const navigate = useNavigate();
  const to = `bills/${bill.id}`;
  const biller = (sub: ReactNode) => (
    <div className="biller">
      <BillerLogo color={bill.color} label={bill.initials} />
      <div>
        <div className="nm">{bill.name}</div>
        {sub}
      </div>
    </div>
  );

  if (item.status === 'offcycle') {
    const next = item.next;
    return (
      <tr className="dim">
        <td>
          {biller(
            <div className="sub">
              {bill.frequency === 'bimonthly' ? 'Bi-monthly' : 'Quarterly'}
              {next ? ` · next statement ${next.statementDate ? formatDay(next.statementDate) : '—'}, due ${formatDay(next.dueDate)}` : ''}
            </div>,
          )}
        </td>
        <td colSpan={5}>
          <StatusPill status="offcycle" />
        </td>
        <td />
        <td />
      </tr>
    );
  }

  return (
    <tr className="click" onClick={() => navigate(to, { preventScrollReset: true })}>
      <td>
        <Link className="row-link" to={to} preventScrollReset onClick={(e) => e.stopPropagation()}>
          {biller(
            <div className="lines">
              {bill.lines.map((l) => (
                <span key={l} className="chip">
                  {l}
                </span>
              ))}
            </div>,
          )}
        </Link>
      </td>
      <td className="num">
        {item.statementDate == null ? 'No statement' : item.status === 'awaiting' ? `Expected ${formatDay(item.statementDate)}` : formatDay(item.statementDate)}
      </td>
      <td className="num strong">{item.dueDate && formatDay(item.dueDate)}</td>
      <td className="r num strong">
        {item.estimated && (
          <span className="muted" title="Estimated from typical amount">
            ~
          </span>
        )}
        {formatMoney(item.amount)}
      </td>
      <td>
        <StatusPill status={item.status} />
        {item.status === 'paid' && item.paidDate && <div className="small muted cell-note">{formatDay(item.paidDate)}</div>}
        {item.status === 'scheduled' && item.scheduledDate && (
          <div className="small muted cell-note">
            {item.method === 'autopay' ? 'Autopay' : 'Scheduled'} {formatDay(item.scheduledDate)}
          </div>
        )}
      </td>
      <td className="small">{account && formatAccount(account)}</td>
      <td className="c">
        <ClearedMark on={closed || !!transaction?.cleared} />
      </td>
      <td className="c">
        <SignoffMark by={item.signedOff ? signer : null} />
      </td>
    </tr>
  );
}

function ReconcileRow({ account, rec, period, signer }: { account: Account; rec: Reconciliation; period: string; signer: string }) {
  const navigate = useNavigate();
  const to = `/reconcile/${account.id}?period=${period}`;
  const signed = rec.status === 'signed-off';
  const diff = rec.summary.difference;
  return (
    <tr className="click" onClick={() => navigate(to)}>
      <td>
        <Link className="row-link" to={to} onClick={(e) => e.stopPropagation()}>
          <div className="biller">
            <BillerLogo color={account.color} label={bankInitials(account.institution)} />
            <div>
              <div className="nm">Reconcile {account.name}</div>
              <div className="sub">
                {account.type === 'checking' ? 'Checking' : 'Savings'} ••{account.last4}
              </div>
            </div>
          </div>
        </Link>
      </td>
      <td colSpan={2} className="small muted">
        Bank balance vs cleared book balance
      </td>
      <td className={`r num strong ${diff === 0 ? 'good' : 'bad'}`}>{diff === null ? '—' : formatMoney(diff)}</td>
      <td>
        {signed ? (
          <Pill tone="paid">Reconciled</Pill>
        ) : diff === 0 ? (
          <Pill tone="scheduled">Ready to sign off</Pill>
        ) : diff === null ? (
          <Pill tone="awaiting">Needs bank balance</Pill>
        ) : (
          <Pill tone="overdue">Difference</Pill>
        )}
      </td>
      <td />
      <td />
      <td className="c">
        <SignoffMark by={signed ? signer : null} />
      </td>
    </tr>
  );
}
