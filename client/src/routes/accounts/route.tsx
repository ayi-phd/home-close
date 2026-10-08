import { Link, Outlet, useLoaderData } from 'react-router';
import { api, type Account, type Reconciliation } from '../../api';
import { BillerLogo, bankInitials } from '../../components/BillerLogo';
import { formatDay, formatMoney, monthName } from '../../components/format';
import { Icon } from '../../components/Icon';
import { Page } from '../../components/Page';
import { Pill } from '../../components/StatusPill';

export async function loader() {
  const session = await api.session.get();
  const [accounts, bills, reconciliations] = await Promise.all([
    api.accounts.list(),
    api.bills.list(),
    api.reconciliations.list(session.currentPeriod),
  ]);
  return { session, accounts, bills, reconciliations };
}

export type AccountsLoaderData = Awaited<ReturnType<typeof loader>>;

export default function Accounts() {
  const { session, accounts, bills, reconciliations } = useLoaderData<typeof loader>();
  return (
    <Page
      title="Accounts"
      eyebrow="Setup"
      actions={
        <Link className="btn primary" to="new">
          <Icon name="plus" /> Add account
        </Link>
      }
    >
      <div className="acct-grid">
        {accounts.map((a) => (
          <AccountCard
            key={a.id}
            account={a}
            billCount={bills.filter((b) => b.accountId === a.id).length}
            rec={reconciliations.find((r) => r.accountId === a.id)!}
            month={monthName(session.currentPeriod).slice(0, 3)}
          />
        ))}
        <Link className="card acct add" to="new">
          <div className="inner">
            <span className="plus">
              <Icon name="plus" />
            </span>
            <b>Add a debit account</b>
            <span className="small">Checking or savings you pay bills from</span>
          </div>
        </Link>
      </div>
      <Outlet />
    </Page>
  );
}

function AccountCard({ account, billCount, rec, month }: { account: Account; billCount: number; rec: Reconciliation; month: string }) {
  const diff = rec.summary.difference;
  return (
    <article className="card acct" aria-labelledby={`acct-${account.id}`}>
      <div className="top">
        <BillerLogo color={account.color} label={bankInitials(account.institution)} />
        <div className="grow">
          <div className="strong" id={`acct-${account.id}`}>
            {account.name}
          </div>
          <div className="small muted">
            {account.type === 'checking' ? 'Checking' : 'Savings'} ••{account.last4} · {account.role}
          </div>
        </div>
      </div>
      <div className="bal-row">
        <div>
          <div className="eyebrow">Book balance</div>
          <div className="bal num">{formatMoney(account.balances.book)}</div>
        </div>
        <Link className="btn sm ghost" to={`${account.id}/edit`} aria-label={`Edit ${account.name}`}>
          Edit
        </Link>
      </div>
      <dl className="rows num">
        <div>
          <dt>Opening ({formatDay(account.openingDate)})</dt>
          <dd>{formatMoney(account.openingBalance)}</dd>
        </div>
        <div>
          <dt>Bank balance (entered)</dt>
          <dd>{rec.bankBalance == null ? '—' : formatMoney(rec.bankBalance)}</dd>
        </div>
        <div>
          <dt>Uncleared items</dt>
          <dd>{account.balances.unclearedCount}</dd>
        </div>
        <div>
          <dt>Bills paid from here</dt>
          <dd>{billCount}</dd>
        </div>
        <div>
          <dt>Last reconciled</dt>
          <dd>{account.lastReconciled ? formatDay(account.lastReconciled) : 'Never'}</dd>
        </div>
      </dl>
      <div className="foot">
        {rec.status === 'signed-off' ? (
          <Pill tone="paid">Reconciled {month}</Pill>
        ) : diff === 0 ? (
          <Pill tone="scheduled">Ready to sign off</Pill>
        ) : diff === null ? (
          <Pill tone="awaiting">No bank balance</Pill>
        ) : (
          <Pill tone="overdue" className="num">
            Off by {formatMoney(Math.abs(diff))}
          </Pill>
        )}
        <span className="spacer" />
        <Link className="btn sm" to={`/activity?account=${account.id}`}>
          Activity
        </Link>
        <Link className="btn sm primary" to={`/reconcile/${account.id}`}>
          Reconcile
        </Link>
      </div>
    </article>
  );
}
