import { useState } from 'react';
import { Form } from 'react-router';
import type { Account, Bill, CloseItem, IsoDate, PaymentMethod } from '../api/types';
import { addMonths, periodOf } from '../api/dates';
import { BillerLogo } from './BillerLogo';
import { Dialog } from './Dialog';
import { Field, FormError } from './Field';
import { centsToInput, formatAccount, formatMoney, formatMonthYear, parseMoney } from './format';
import { MoneyInput } from './MoneyInput';
import { SegButtons } from './Seg';
import { StatusPill } from './StatusPill';
import { CATEGORY_LABEL, FREQUENCY_LABEL } from './billLabels';

export type BillDrawerIntent = 'save-statement' | 'schedule' | 'pay';
export type PayChoice = 'statement' | 'minimum' | 'other';

const FORM_ID = 'bill-drawer-form';
const STEPS = [
  ['awaiting', 'Statement'],
  ['entered', 'Entered'],
  ['scheduled', 'Scheduled'],
  ['paid', 'Paid'],
] as const;
export const METHOD_LABEL: Record<PaymentMethod, string> = {
  website: 'Biller website',
  autopay: 'Autopay',
  'bill-pay': 'Bank bill pay',
  check: 'Check',
};

/** Side panel for one bill in a close period: enter the statement, then schedule or record the payment. */
export function BillDrawer({
  bill,
  item,
  accounts,
  today,
  readOnly,
  errors = {},
  formError,
  busy,
  onClose,
}: {
  bill: Bill;
  item: CloseItem;
  accounts: Account[];
  today: IsoDate;
  readOnly: boolean;
  errors?: Record<string, string>;
  formError?: string;
  busy?: boolean;
  onClose: () => void;
}) {
  const isCard = bill.category === 'credit-card';
  const initialLines = item.lines.length > 0 ? item.lines : bill.lines.map((name) => ({ name, amount: 0 }));
  const multi = initialLines.length > 1;
  const [amounts, setAmounts] = useState(initialLines.map((l) => centsToInput(l.amount)));
  const [payChoice, setPayChoice] = useState<PayChoice>(bill.defaultPayment === 'minimum' ? 'minimum' : 'statement');
  const total = amounts.reduce((sum, a) => sum + (parseMoney(a) ?? 0), 0);
  const payAccount = accounts.find((a) => a.id === bill.accountId);
  const stepIndex = STEPS.findIndex(([s]) => s === item.status);

  return (
    <Dialog
      variant="drawer"
      title={bill.name}
      sub={`${CATEGORY_LABEL[bill.category]} · ${FREQUENCY_LABEL[bill.frequency]}${bill.reference ? ` · Acct ••${bill.reference}` : ''}`}
      leading={<BillerLogo color={bill.color} label={bill.initials} />}
      status={<StatusPill status={item.status} />}
      onClose={onClose}
      footer={
        readOnly ? (
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        ) : (
          <>
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" form={FORM_ID} name="intent" value="save-statement" className="btn" disabled={busy}>
              Save statement
            </button>
            <button type="submit" form={FORM_ID} name="intent" value="schedule" className="btn" disabled={busy || item.status === 'paid'}>
              Schedule
            </button>
            <button type="submit" form={FORM_ID} name="intent" value="pay" className="btn primary" disabled={busy}>
              Record payment
            </button>
          </>
        )
      }
    >
      <Form method="post" id={FORM_ID} className="db" noValidate>
        <FormError message={formError} />
        <ol className="timeline" aria-label="Progress">
          {STEPS.map(([status, label], k) => {
            const done = stepIndex >= k;
            return (
              <li key={status} className={done ? 'done' : undefined}>
                {done ? '●' : '○'} {label}
                {k < STEPS.length - 1 && <span aria-hidden="true"> —</span>}
              </li>
            );
          })}
        </ol>

        <fieldset disabled={readOnly} className="sect plain">
          <div className="sect-t">
            <span className="stepno">1</span>
            <h3>Statement</h3>
          </div>
          <div className="grid2">
            <Field label="Statement date" error={errors.statementDate} hint={bill.statementDay == null ? 'This bill has no statements.' : undefined}>
              {(p) => <input {...p} className="input" type="date" name="statementDate" defaultValue={item.statementDate ?? ''} />}
            </Field>
            <Field label="Due date" error={errors.dueDate}>
              {(p) => <input {...p} className="input" type="date" name="dueDate" defaultValue={item.dueDate ?? ''} required />}
            </Field>
          </div>
          {(item.servicePeriod || bill.frequency !== 'monthly') && (
            <div className="grid2">
              <Field label="Service from" error={errors.servicePeriod}>
                {(p) => <input {...p} className="input" type="date" name="serviceStart" defaultValue={item.servicePeriod?.start ?? ''} />}
              </Field>
              <Field label="Service to" hint={`${FREQUENCY_LABEL[bill.frequency]} bill · covers about ${bill.frequency === 'bimonthly' ? 60 : bill.frequency === 'quarterly' ? 90 : 30} days of service`}>
                {(p) => <input {...p} className="input" type="date" name="serviceEnd" defaultValue={item.servicePeriod?.end ?? ''} />}
              </Field>
            </div>
          )}
          {isCard && (
            <div className="grid2">
              <Field label="Minimum due" error={errors.minimumDue}>
                {(p) => <MoneyInput {...p} name="minimumDue" defaultValue={centsToInput(item.minimumDue)} placeholder="0.00" />}
              </Field>
              <div className="field">
                <span className="lbl">Pay</span>
                <SegButtons
                  label="Pay"
                  value={payChoice}
                  onChange={setPayChoice}
                  disabled={readOnly}
                  options={[
                    { value: 'statement', label: 'Statement balance' },
                    { value: 'minimum', label: 'Minimum' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
                <input type="hidden" name="payChoice" value={payChoice} />
              </div>
            </div>
          )}
          {isCard && payChoice === 'other' && (
            <Field label="Payment amount" error={errors.amount}>
              {(p) => <MoneyInput {...p} name="otherAmount" placeholder="0.00" defaultValue={centsToInput(item.paidAmount)} />}
            </Field>
          )}
          {multi ? (
            <div className="field">
              <span className="lbl">Charges by service</span>
              <div className="lineitems">
                {initialLines.map((line, k) => (
                  <div className="li" key={k}>
                    <label htmlFor={`line-${k}`}>{line.name}</label>
                    <input type="hidden" name="lineName" value={line.name} />
                    <MoneyInput
                      id={`line-${k}`}
                      name="lineAmount"
                      value={amounts[k]}
                      aria-invalid={errors[`lines.${k}`] ? true : undefined}
                      onChange={(e) => setAmounts(amounts.map((a, j) => (j === k ? e.target.value : a)))}
                    />
                  </div>
                ))}
                <div className="li">
                  <span>Statement total</span>
                  <output className="num total" aria-live="polite" aria-label="Statement total">
                    {formatMoney(total)}
                  </output>
                </div>
              </div>
              <span className="hint">One statement, several utilities. Each line is tracked separately for usage trends.</span>
            </div>
          ) : (
            <Field
              label="Statement amount"
              error={errors['lines.0'] ?? errors.lines}
              hint={item.estimated ? 'Pre-filled with the typical amount. Replace it when the statement arrives.' : undefined}
            >
              {(p) => (
                <>
                  <input type="hidden" name="lineName" value={initialLines[0]?.name ?? bill.lines[0] ?? bill.name} />
                  <MoneyInput {...p} name="lineAmount" value={amounts[0] ?? ''} onChange={(e) => setAmounts([e.target.value])} />
                </>
              )}
            </Field>
          )}
        </fieldset>

        <fieldset disabled={readOnly} className="sect plain">
          <div className="sect-t">
            <span className="stepno">2</span>
            <h3>Payment</h3>
          </div>
          <div className="grid2">
            <Field label="Payment date" error={errors.date}>
              {(p) => <input {...p} className="input" type="date" name="paymentDate" defaultValue={item.paidDate ?? item.scheduledDate ?? today} />}
            </Field>
            <Field label="Pay from" error={errors.accountId}>
              {(p) => (
                <select {...p} className="input" name="accountId" defaultValue={item.accountId}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ••{a.last4}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className="grid2">
            <Field label="Method" error={errors.method}>
              {(p) => (
                <select {...p} className="input" name="method" defaultValue={item.method ?? (bill.autopay ? 'autopay' : 'website')}>
                  {Object.entries(METHOD_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Confirmation #">
              {(p) => <input {...p} className="input" name="confirmation" placeholder="Optional" defaultValue={item.confirmation ?? ''} />}
            </Field>
          </div>
          {bill.autopay && payAccount && (
            <div className="small callout">
              Autopay is on. This payment will post from {formatAccount(payAccount)} on the due date.
            </div>
          )}
        </fieldset>

        {bill.loan && (
          <section className="sect" aria-label="Loan">
            <div className="sect-t">
              <span className="stepno">i</span>
              <h3>Loan</h3>
            </div>
            <dl className="grid3 small plain">
              <div>
                <dt className="muted">Payments left</dt>
                <dd className="num strong">{bill.loan.paymentsLeft}</dd>
              </div>
              <div>
                <dt className="muted">Balance</dt>
                <dd className="num strong">{formatMoney(bill.loan.balance)}</dd>
              </div>
              <div>
                <dt className="muted">Payoff</dt>
                <dd className="strong">{formatMonthYear(addMonths(periodOf(today), bill.loan.paymentsLeft))}</dd>
              </div>
            </dl>
          </section>
        )}
      </Form>
    </Dialog>
  );
}
