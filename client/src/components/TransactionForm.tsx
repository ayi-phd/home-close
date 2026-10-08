import { useState } from 'react';
import { Form } from 'react-router';
import type { Account, IsoDate } from '../api/types';
import { Field, FormError } from './Field';
import { formatAccount } from './format';
import { Icon } from './Icon';
import { MoneyInput } from './MoneyInput';
import { SegButtons } from './Seg';

export type EntryKind = 'expense' | 'deposit' | 'transfer';

export const CATEGORY_OPTIONS: Record<Exclude<EntryKind, 'transfer'>, string[]> = {
  expense: ['Groceries', 'Dining', 'Household', 'Auto & fuel', 'Medical', 'Insurance', 'Other'],
  deposit: ['Income', 'Refund', 'Other'],
};

const KIND_OPTIONS: { value: EntryKind; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'transfer', label: 'Transfer' },
];

/**
 * Expense, deposit or transfer entry. `layout="inline"` is the quick-add row on the activity
 * page; `layout="stacked"` sits in a modal whose footer submits it through `id`.
 */
export function TransactionForm({
  id,
  layout,
  accounts,
  defaultAccountId,
  today,
  errors = {},
  formError,
  busy,
  action,
}: {
  id: string;
  layout: 'inline' | 'stacked';
  accounts: Account[];
  defaultAccountId?: string;
  today: IsoDate;
  errors?: Record<string, string>;
  formError?: string;
  busy?: boolean;
  action?: string;
}) {
  const [kind, setKind] = useState<EntryKind>('expense');
  const from = defaultAccountId ?? accounts[0]?.id;
  const to = accounts.find((a) => a.id !== from)?.id;

  const kindField = (
    <div className={layout === 'inline' ? 'field full' : 'field'}>
      <span className="lbl">Type</span>
      <SegButtons label="Entry type" value={kind} onChange={setKind} options={KIND_OPTIONS} />
      <input type="hidden" name="kind" value={kind} />
    </div>
  );
  const date = (
    <Field label="Date" error={errors.date}>
      {(p) => <input {...p} className="input" type="date" name="date" defaultValue={today} />}
    </Field>
  );
  const description = (
    <Field label="Description" error={errors.description} className={layout === 'inline' ? 'wide' : undefined}>
      {(p) => (
        <input
          {...p}
          className="input"
          name="description"
          required={kind !== 'transfer'}
          placeholder={kind === 'transfer' ? 'Optional' : kind === 'deposit' ? 'e.g. Payroll' : 'e.g. Ralphs groceries'}
        />
      )}
    </Field>
  );
  const category =
    kind === 'transfer' ? null : (
      <Field label="Category" error={errors.category}>
        {(p) => (
          <select {...p} key={kind} className="input" name="category">
            {CATEGORY_OPTIONS[kind].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
      </Field>
    );
  const accountSelect = (name: 'accountId' | 'toAccountId', label: string, value: string | undefined) => (
    <Field label={label} error={errors[name]}>
      {(p) => (
        <select {...p} className="input" name={name} defaultValue={value}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {formatAccount(a)}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
  const fromField = accountSelect('accountId', kind === 'transfer' ? 'From' : 'Account', from);
  const toField = kind === 'transfer' ? accountSelect('toAccountId', 'To', to) : null;
  const amount = (
    <Field label="Amount" error={errors.amount}>
      {(p) => <MoneyInput {...p} name="amount" required placeholder="0.00" />}
    </Field>
  );

  return (
    <Form method="post" id={id} action={action} className={layout === 'inline' ? 'card-b quick-add' : 'db'} noValidate>
      {layout === 'inline' ? (
        <>
          {formError && <div className="full"><FormError message={formError} /></div>}
          {kindField}
          {date}
          {description}
          {category}
          {fromField}
          {toField}
          {amount}
          <button className="btn primary" type="submit" disabled={busy}>
            <Icon name="plus" /> Add
          </button>
        </>
      ) : (
        <>
          <FormError message={formError} />
          {kindField}
          <div className="grid2">
            {description}
            {amount}
          </div>
          <div className="grid3">
            {date}
            {category}
            {fromField}
            {toField}
          </div>
        </>
      )}
    </Form>
  );
}
