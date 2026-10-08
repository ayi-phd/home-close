import { Link, redirect, useActionData, useLoaderData, useNavigate, useNavigation, useSearchParams, type ActionFunctionArgs } from 'react-router';
import { api, type Account, type CloseItem, type Reconciliation } from '../../api';
import { addMonths, daysInMonth, parseIso, parsePeriod, periodOf } from '../../api/dates';
import { BillerLogo, bankInitials } from '../../components/BillerLogo';
import { Dialog } from '../../components/Dialog';
import { formatAccount, formatDay, formatLongDate, formatMoney, formatPeriod, monthName } from '../../components/format';
import { Icon } from '../../components/Icon';
import { Kpi, KpiRow } from '../../components/Kpi';
import { MonthCalendar, type CalendarMark } from '../../components/MonthCalendar';
import { Page } from '../../components/Page';
import { ProgressRing } from '../../components/ProgressRing';
import { Pill, StatusPill } from '../../components/StatusPill';
import { TransactionForm } from '../../components/TransactionForm';
import { showToast } from '../../components/toast';
import { parseTransactionForm, toActionError, type ActionResult } from '../helpers';

export async function loader() {
  const session = await api.session.get();
  const [period, next, accounts, bills, reconciliations] = await Promise.all([
    api.periods.get(session.currentPeriod),
    api.periods.get(addMonths(session.currentPeriod, 1)),
    api.accounts.list(),
    api.bills.list(),
    api.reconciliations.list(session.currentPeriod),
  ]);
  // Statements that close this month come from this period's and next period's checklist.
  const statementDates = [...period.items, ...next.items]
    .map((i) => i.statementDate)
    .filter((d): d is string => d != null && periodOf(d) === session.currentPeriod);
  return { session, period, accounts, bills, reconciliations, statementDates };
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  try {
    await api.transactions.create(parseTransactionForm(form));
  } catch (error) {
    return toActionError(error);
  }
  showToast('Entry added · mark it cleared when it posts');
  return redirect('/');
}

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Overview() {
  const { session, period, accounts, bills, reconciliations, statementDates } = useLoaderData<typeof loader>();
  const result = useActionData<ActionResult>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { progress } = period;
  const month = monthName(period.period);
  const checking = accounts.filter((a) => a.type === 'checking');
  const cash = checking.reduce((sum, a) => sum + a.balances.book, 0);
  const afterBills = cash - progress.remaining;
  const upcoming = period.items.filter((i) => i.status !== 'paid' && i.status !== 'offcycle');
  const marks: { date: string; kind: CalendarMark }[] = [
    ...statementDates.map((date) => ({ date, kind: 'statement' as const })),
    ...period.items.filter((i) => i.dueDate).map((i) => ({ date: i.dueDate!, kind: (i.status === 'paid' ? 'paid' : 'due') as CalendarMark })),
  ];

  return (
    <Page
      title={`${greeting(new Date().getHours())}, ${session.user.firstName}`}
      eyebrow={formatLongDate(session.today)}
      actions={
        <>
          <Link className="btn" to="?new=expense">
            <Icon name="plus" /> Add expense
          </Link>
          <Link className="btn primary" to={`/close/${period.period}`}>
            Continue close
          </Link>
        </>
      }
    >
      <CloseBar period={period.period} today={session.today} progress={progress} />

      <KpiRow label="This month">
        <Kpi label={`Due in ${month}`} value={formatMoney(progress.totalDue)} sub={`${progress.billCount} bills · ${progress.estimatedCount} estimated`} />
        <Kpi
          label="Paid so far"
          value={formatMoney(progress.paid)}
          meter={progress.totalDue ? progress.paid / progress.totalDue : 0}
          sub={`${progress.totalDue ? Math.round((progress.paid / progress.totalDue) * 100) : 0}% of this month's bills`}
        />
        <Kpi label="Checking balance" value={formatMoney(cash)} sub={`Book balance, ${checking.length} checking accounts`} />
        <Kpi label="After remaining bills" value={formatMoney(afterBills)} tone={afterBills > 100000 ? 'good' : 'warn'} sub={`${formatMoney(progress.remaining)} still to pay`} />
      </KpiRow>

      <section className="two">
        <div className="card">
          <div className="card-h">
            <h3>Coming up</h3>
            <Link className="btn sm ghost" to={`/close/${period.period}`}>
              View all
            </Link>
          </div>
          <div className="list">
            {upcoming.length === 0 && <p className="empty">Every bill this month is paid.</p>}
            {upcoming.map((item) => (
              <UpcomingRow key={item.billId} item={item} bill={bills.find((b) => b.id === item.billId)!} account={accounts.find((a) => a.id === item.accountId)} />
            ))}
          </div>
        </div>
        <div className="col">
          <div className="card">
            <div className="card-h">
              <h3>{month} calendar</h3>
              <span className="small muted">Statement dates vary by biller</span>
            </div>
            <div className="card-b">
              <MonthCalendar period={period.period} today={session.today} marks={marks} />
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <h3>Reconciliation</h3>
              <Link className="btn sm ghost" to="/reconcile">
                Reconcile
              </Link>
            </div>
            <div className="list">
              {accounts.map((a) => (
                <ReconcileRow key={a.id} account={a} rec={reconciliations.find((r) => r.accountId === a.id)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {params.get('new') === 'expense' && (
        <Dialog
          variant="modal"
          title="Add expense or deposit"
          onClose={() => navigate('/', { preventScrollReset: true })}
          footer={
            <>
              <button type="button" className="btn ghost" onClick={() => navigate('/', { preventScrollReset: true })}>
                Cancel
              </button>
              <button type="submit" form="overview-entry" className="btn primary" disabled={navigation.state === 'submitting'}>
                Add entry
              </button>
            </>
          }
        >
          <TransactionForm id="overview-entry" layout="stacked" action="/?index&new=expense" accounts={accounts} today={session.today} errors={result?.errors} formError={result?.formError} />
        </Dialog>
      )}
    </Page>
  );
}

function CloseBar({ period, today, progress }: { period: string; today: string; progress: Awaited<ReturnType<typeof loader>>['period']['progress'] }) {
  const { year, month } = parsePeriod(period);
  const daysLeft = daysInMonth(year, month) - parseIso(today).day;
  const nextMonth = formatDay(`${addMonths(period, 1)}-05`);
  const live = progress.billCount;
  const stages: { label: string; value: string; fraction: number; fill: string }[] = [
    { label: 'Awaiting statement', value: String(progress.byStatus.awaiting), fraction: progress.byStatus.awaiting / live, fill: 'fill-faint' },
    { label: 'Statement entered', value: String(progress.byStatus.entered), fraction: progress.byStatus.entered / live, fill: 'fill-info' },
    { label: 'Payment scheduled', value: String(progress.byStatus.scheduled), fraction: progress.byStatus.scheduled / live, fill: 'fill-primary' },
    { label: 'Paid', value: String(progress.byStatus.paid), fraction: progress.byStatus.paid / live, fill: 'fill-good' },
    {
      label: 'Accounts reconciled',
      value: `${progress.reconciledCount} / ${progress.accountCount}`,
      fraction: progress.reconciledCount / progress.accountCount,
      fill: 'fill-good',
    },
  ];
  return (
    <section className="card closebar" aria-label="Close progress">
      <ProgressRing value={progress.tasks ? progress.tasksDone / progress.tasks : 0} label={`${progress.tasksDone}/${progress.tasks}`} sub="tasks done" />
      <div className="body">
        <div className="row-wrap">
          <h2>{formatPeriod(period)} close</h2>
          <Pill tone="warn">{daysLeft} days left</Pill>
          <span className="small muted">
            Bills due {formatDay(`${period}-01`)}–{daysInMonth(year, month)} · reconcile by {nextMonth}
          </span>
        </div>
        <div className="stages">
          {stages.map((s) => (
            <div className="stage" key={s.label}>
              <span className="t">{s.label}</span>
              <span className="n num">{s.value}</span>
              <div className="bar">
                <i className={s.fill} style={{ width: `${(s.fraction || 0) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="cb-act">
        <Link className="btn primary" to={`/close/${period}`}>
          Open checklist <Icon name="chev" />
        </Link>
      </div>
    </section>
  );
}

function UpcomingRow({ item, bill, account }: { item: CloseItem; bill: { name: string; lines: string[] }; account?: Account }) {
  const [mon, day] = formatDay(item.dueDate!).split(' ');
  return (
    <Link className="it" to={`/close/${item.period}/bills/${item.billId}`}>
      <div className="date-badge" aria-label={`Due ${formatDay(item.dueDate!)}`}>
        <span>{mon!.toUpperCase()}</span>
        <b className="num">{day}</b>
      </div>
      <div className="grow">
        <div className="strong">{bill.name}</div>
        <div className="small muted">
          {bill.lines.join(' · ')}
          {account && ` · from ${formatAccount(account)}`}
        </div>
      </div>
      <div className="end">
        <span className="num strong">
          {item.estimated && <span title="Estimated from typical amount">~</span>}
          {formatMoney(item.amount)}
        </span>
        <StatusPill status={item.status} />
      </div>
    </Link>
  );
}

function ReconcileRow({ account, rec }: { account: Account; rec?: Reconciliation }) {
  const diff = rec?.summary.difference ?? null;
  return (
    <div className="it">
      <BillerLogo color={account.color} label={bankInitials(account.institution)} />
      <div className="grow">
        <div className="strong">{account.name}</div>
        <div className="small muted">Last reconciled {account.lastReconciled ? formatDay(account.lastReconciled) : 'never'}</div>
      </div>
      {rec?.status === 'signed-off' ? (
        <Pill tone="paid">Signed off</Pill>
      ) : diff === 0 ? (
        <Pill tone="scheduled">Ready</Pill>
      ) : diff === null ? (
        <Pill tone="awaiting">No bank balance</Pill>
      ) : (
        <Pill tone="overdue" className="num">
          {formatMoney(diff)}
        </Pill>
      )}
    </div>
  );
}
