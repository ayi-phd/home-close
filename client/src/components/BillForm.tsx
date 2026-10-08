import { useState } from 'react';
import { Form } from 'react-router';
import type { Account, Bill, BillCategory, DefaultPayment, Frequency } from '../api/types';
import { Dialog } from './Dialog';
import { Field, FormError } from './Field';
import { centsToInput } from './format';
import { MoneyInput } from './MoneyInput';
import { SegButtons } from './Seg';
import { CATEGORIES, CATEGORY_LABEL, CYCLE_OPTIONS, FREQUENCY_LABEL, SERVICE_OPTIONS } from './billLabels';

const FORM_ID = 'bill-form';
const NAME_PLACEHOLDER: Record<BillCategory, string> = {
  utilities: 'e.g. LADWP',
  'internet-mobile': 'e.g. AT&T',
  'credit-card': 'e.g. Chase Freedom',
  loan: 'e.g. Honda Financial',
};

function defaultLines(category: BillCategory): string[] {
  if (category === 'utilities') return ['Electricity'];
  if (category === 'internet-mobile') return ['Internet'];
  if (category === 'credit-card') return ['Pay statement balance'];
  return ['Installment'];
}

/** Add or edit a recurring bill. Submits a plain form; the route action builds the BillInput. */
export function BillForm({
  bill,
  accounts,
  errors = {},
  formError,
  busy,
  onClose,
}: {
  bill?: Bill;
  accounts: Account[];
  errors?: Record<string, string>;
  formError?: string;
  busy?: boolean;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<BillCategory>(bill?.category ?? 'utilities');
  const [lines, setLines] = useState<string[]>(bill?.lines ?? defaultLines('utilities'));
  const [frequency, setFrequency] = useState<Frequency>(bill?.frequency ?? 'monthly');
  const [defaultPayment, setDefaultPayment] = useState<DefaultPayment>(bill?.defaultPayment ?? 'statement');
  const services = SERVICE_OPTIONS[category];
  const isLoan = category === 'loan';

  function changeCategory(next: BillCategory) {
    setCategory(next);
    setLines(bill?.category === next ? bill.lines : defaultLines(next));
  }

  function toggleService(service: string) {
    setLines((current) =>
      current.some((l) => l.startsWith(service)) ? current.filter((l) => !l.startsWith(service)) : [...current, service],
    );
  }

  return (
    <Dialog
      variant="modal"
      title={bill ? `Edit ${bill.name}` : 'Add a recurring bill'}
      sub="One biller can cover several services on the same statement."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="btn primary" disabled={busy}>
            {bill ? 'Save changes' : 'Add bill'}
          </button>
        </>
      }
    >
      <Form method="post" id={FORM_ID} className="db" noValidate>
        <FormError message={formError} />
        <div className="field">
          <span className="lbl">Type</span>
          <SegButtons label="Type" value={category} onChange={changeCategory} options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
          <input type="hidden" name="category" value={category} />
        </div>
        <div className="grid2">
          <Field label="Biller name" error={errors.name}>
            {(p) => <input {...p} className="input" name="name" required defaultValue={bill?.name} placeholder={NAME_PLACEHOLDER[category]} />}
          </Field>
          <Field label="Account / card ending" error={errors.reference}>
            {(p) => <input {...p} className="input num" name="reference" inputMode="numeric" maxLength={4} defaultValue={bill?.reference} placeholder="Last 4 digits" />}
          </Field>
        </div>

        {services.length > 0 ? (
          <div className="field">
            <span className="lbl" id="services-label">Services on this statement</span>
            <div className="togglechips" role="group" aria-labelledby="services-label">
              {services.map((s) => {
                const on = lines.some((l) => l.startsWith(s));
                return (
                  <button key={s} type="button" className={on ? 'on' : ''} aria-pressed={on} onClick={() => toggleService(s)}>
                    {s}
                  </button>
                );
              })}
            </div>
            {lines.map((l) => (
              <input key={l} type="hidden" name="lines" value={l} />
            ))}
            {errors.lines ? <span className="field-error">{errors.lines}</span> : <span className="hint">Example: LADWP bills electricity, water and trash pickup together.</span>}
          </div>
        ) : isLoan ? (
          <Field label="What the loan is for" error={errors.lines}>
            {(p) => <input {...p} className="input" name="lines" defaultValue={lines[0]} placeholder="e.g. 2023 RAV4" />}
          </Field>
        ) : (
          lines.map((l) => <input key={l} type="hidden" name="lines" value={l} />)
        )}

        <div className="grid2">
          <Field label="How often" error={errors.frequency}>
            {(p) => (
              <select {...p} className="input" name="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
                {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Billed in" hint="For bills that aren't monthly" error={errors.cycleAnchorMonth}>
            {(p) =>
              frequency === 'monthly' ? (
                <select {...p} className="input" disabled>
                  <option>Every month</option>
                </select>
              ) : (
                <select {...p} key={frequency} className="input" name="cycleAnchorMonth" defaultValue={bill?.frequency === frequency ? (bill.cycleAnchorMonth ?? 1) : 1}>
                  {CYCLE_OPTIONS[frequency].map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )
            }
          </Field>
        </div>

        <div className="grid2">
          <Field label="Statement day" error={errors.statementDay}>
            {(p) => (
              <input {...p} className="input num" name="statementDay" type="number" min={1} max={31} defaultValue={bill?.statementDay ?? ''} placeholder={isLoan ? 'Optional' : '1–31'} />
            )}
          </Field>
          <Field label="Due">
            {(p) => (
              <select {...p} className="input" name="dueKind" defaultValue={bill?.dueRule.kind ?? 'fixed-day'}>
                <option value="fixed-day">Fixed day of month</option>
                <option value="days-after-statement">Days after statement</option>
              </select>
            )}
          </Field>
        </div>

        <div className="grid2">
          <Field label="Due day / days after" error={errors.dueRule}>
            {(p) => (
              <input
                {...p}
                className="input num"
                name="dueValue"
                type="number"
                min={1}
                defaultValue={bill ? (bill.dueRule.kind === 'fixed-day' ? bill.dueRule.day : bill.dueRule.days) : ''}
                placeholder="e.g. 21"
              />
            )}
          </Field>
          <Field label={isLoan ? 'Monthly payment' : 'Typical amount'} error={errors.typicalAmount}>
            {(p) => <MoneyInput {...p} name="typicalAmount" defaultValue={centsToInput(bill?.typicalAmount)} placeholder="0.00" />}
          </Field>
        </div>

        {isLoan && (
          <div className="grid3">
            <Field label="Current balance" error={errors['loan.balance']}>
              {(p) => <MoneyInput {...p} name="loanBalance" defaultValue={centsToInput(bill?.loan?.balance)} placeholder="0.00" />}
            </Field>
            <Field label="Payments left" error={errors['loan.paymentsLeft']}>
              {(p) => <input {...p} className="input num" name="loanPaymentsLeft" type="number" min={0} defaultValue={bill?.loan?.paymentsLeft ?? ''} />}
            </Field>
            <Field label="APR %" error={errors['loan.aprBps']}>
              {(p) => (
                <input {...p} className="input num" name="loanApr" inputMode="decimal" placeholder="4.9" defaultValue={bill?.loan?.aprBps != null ? (bill.loan.aprBps / 100).toFixed(2) : ''} />
              )}
            </Field>
          </div>
        )}

        {category === 'credit-card' && (
          <div className="field">
            <span className="lbl">Default payment</span>
            <SegButtons
              label="Default payment"
              value={defaultPayment}
              onChange={setDefaultPayment}
              options={[
                { value: 'statement', label: 'Statement balance' },
                { value: 'minimum', label: 'Minimum due' },
                { value: 'fixed', label: 'Fixed amount' },
              ]}
            />
            <input type="hidden" name="defaultPayment" value={defaultPayment} />
          </div>
        )}

        <div className="grid2 grid-end">
          <Field label="Pay from" error={errors.accountId}>
            {(p) => (
              <select {...p} className="input" name="accountId" defaultValue={bill?.accountId ?? accounts[0]?.id}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ••{a.last4}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="stack-xs">
            <label className="switch">
              <input type="checkbox" name="fixedAmount" defaultChecked={bill ? bill.amountType === 'fixed' : isLoan} /> Same amount every time
            </label>
            <label className="switch">
              <input type="checkbox" name="autopay" defaultChecked={bill?.autopay} /> Autopay is on
            </label>
          </div>
        </div>
      </Form>
    </Dialog>
  );
}
