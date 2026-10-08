import { Fragment } from 'react';
import { Link, Outlet, useLoaderData, useLocation, type LoaderFunctionArgs } from 'react-router';
import { api, type Account, type Bill, type BillCategory } from '../../api';
import { BillerLogo } from '../../components/BillerLogo';
import { CATEGORIES, CATEGORY_LABEL, cycleLabel, dueRuleLabel, FREQUENCY_LABEL } from '../../components/billLabels';
import { formatAccount, formatMoney } from '../../components/format';
import { Icon } from '../../components/Icon';
import { Kpi, KpiRow } from '../../components/Kpi';
import { Page } from '../../components/Page';
import { SegLinks } from '../../components/Seg';
import { Pill } from '../../components/StatusPill';

export async function loader({ request }: LoaderFunctionArgs) {
  const category = new URL(request.url).searchParams.get('category');
  const [bills, accounts] = await Promise.all([api.bills.list(), api.accounts.list()]);
  return { bills, accounts, category: CATEGORIES.includes(category as BillCategory) ? (category as BillCategory) : null };
}

export type BillsLoaderData = Awaited<ReturnType<typeof loader>>;

const MONTHS_PER_BILL = { monthly: 1, bimonthly: 2, quarterly: 3 } as const;

export default function Bills() {
  const { bills, accounts, category } = useLoaderData<typeof loader>();
  const { search } = useLocation();
  const shown = bills.filter((b) => !category || b.category === category);
  const monthlyCost = Math.round(bills.reduce((sum, b) => sum + b.typicalAmount / MONTHS_PER_BILL[b.frequency], 0));
  const statementDays = [...new Set(bills.map((b) => b.statementDay).filter((d): d is number => d != null))].sort((a, b) => a - b);

  return (
    <Page
      title="Recurring bills"
      eyebrow="Setup"
      actions={
        <Link className="btn primary" to={`new${search}`}>
          <Icon name="plus" /> Add bill
        </Link>
      }
    >
      <KpiRow label="Bill totals">
        <Kpi label="Recurring bills" value={bills.length} sub={`${bills.reduce((s, b) => s + b.lines.length, 0)} services tracked`} />
        <Kpi label="Avg. monthly cost" value={formatMoney(monthlyCost)} sub="Bi-monthly bills averaged per month" />
        <Kpi label="On autopay" value={bills.filter((b) => b.autopay).length} sub="Still verified at close" />
        <Kpi label="Statement days" value={statementDays.join(' · ')} compact sub="Day of month each statement closes" />
      </KpiRow>

      <div className="filters">
        <SegLinks
          label="Category"
          options={[
            { to: '/bills', label: 'All', active: category === null },
            ...CATEGORIES.map((c) => ({ to: `/bills?category=${c}`, label: CATEGORY_LABEL[c], active: category === c })),
          ]}
        />
      </div>

      <section className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Biller &amp; services</th>
                <th>Frequency</th>
                <th>Statement</th>
                <th>Due</th>
                <th className="r">Amount</th>
                <th>Pay from</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.filter((c) => shown.some((b) => b.category === c)).map((c) => (
                <Fragment key={c}>
                  <tr className="group">
                    <td colSpan={7}>{CATEGORY_LABEL[c]}</td>
                  </tr>
                  {shown
                    .filter((b) => b.category === c)
                    .map((b) => (
                      <BillRow key={b.id} bill={b} account={accounts.find((a) => a.id === b.accountId)} search={search} />
                    ))}
                </Fragment>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    No bills in this category yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <Outlet />
    </Page>
  );
}

function BillRow({ bill, account, search }: { bill: Bill; account?: Account; search: string }) {
  const cycle = cycleLabel(bill);
  return (
    <tr>
      <td>
        <div className="biller">
          <BillerLogo color={bill.color} label={bill.initials} />
          <div>
            <div className="nm">
              {bill.name} {bill.reference && <span className="muted small ref">••{bill.reference}</span>}
            </div>
            <div className="lines">
              {bill.lines.map((l) => (
                <span key={l} className="chip">
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </td>
      <td>
        {FREQUENCY_LABEL[bill.frequency]}
        {cycle && <div className="small muted">{cycle}</div>}
      </td>
      <td className="num">{bill.statementDay ? `Day ${bill.statementDay}` : <span className="muted">None</span>}</td>
      <td className="small">{dueRuleLabel(bill.dueRule, bill.statementDay)}</td>
      <td className="r num">
        <b>{formatMoney(bill.typicalAmount)}</b>
        <div className="small muted">{bill.amountType === 'fixed' ? 'Fixed' : 'Typical'}</div>
      </td>
      <td className="small">
        {account && formatAccount(account)}
        {bill.autopay && (
          <div>
            <Pill tone="scheduled" className="cell-note">
              Autopay
            </Pill>
          </div>
        )}
      </td>
      <td className="r">
        <Link className="btn sm ghost" to={`${bill.id}/edit${search}`} aria-label={`Edit ${bill.name}`}>
          Edit
        </Link>
      </td>
    </tr>
  );
}
