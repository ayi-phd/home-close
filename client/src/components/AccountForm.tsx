import { Form } from 'react-router';
import type { Account, IsoDate } from '../api/types';
import { Dialog } from './Dialog';
import { Field, FormError } from './Field';
import { centsToInput } from './format';
import { MoneyInput } from './MoneyInput';

const FORM_ID = 'account-form';

/** Add or edit a checking or savings account. */
export function AccountForm({
  account,
  defaultDate,
  errors = {},
  formError,
  busy,
  onClose,
}: {
  account?: Account;
  defaultDate: IsoDate;
  errors?: Record<string, string>;
  formError?: string;
  busy?: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      variant="modal"
      title={account ? `Edit ${account.name}` : 'Add a debit account'}
      sub="Enter the balance from your bank on the day you start tracking."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="btn primary" disabled={busy}>
            {account ? 'Save changes' : 'Add account'}
          </button>
        </>
      }
    >
      <Form method="post" id={FORM_ID} className="db" noValidate>
        <FormError message={formError} />
        <div className="grid2">
          <Field label="Account nickname" error={errors.name}>
            {(p) => <input {...p} className="input" name="name" required defaultValue={account?.name} placeholder="e.g. Joint Checking" />}
          </Field>
          <Field label="Bank" error={errors.institution}>
            {(p) => <input {...p} className="input" name="institution" required defaultValue={account?.institution} placeholder="e.g. Bank of America" />}
          </Field>
        </div>
        <div className="grid3">
          <Field label="Type" error={errors.type}>
            {(p) => (
              <select {...p} className="input" name="type" defaultValue={account?.type ?? 'checking'}>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            )}
          </Field>
          <Field label="Last 4 digits" error={errors.last4}>
            {(p) => <input {...p} className="input num" name="last4" inputMode="numeric" maxLength={4} defaultValue={account?.last4} placeholder="0000" />}
          </Field>
          <Field label="Balance as of" error={errors.openingDate}>
            {(p) => <input {...p} className="input" name="openingDate" type="date" defaultValue={account?.openingDate ?? defaultDate} />}
          </Field>
        </div>
        <Field label="Opening balance" error={errors.openingBalance} hint="Use the bank's posted balance, not the available balance.">
          {(p) => <MoneyInput {...p} name="openingBalance" defaultValue={centsToInput(account?.openingBalance)} placeholder="0.00" />}
        </Field>
      </Form>
    </Dialog>
  );
}
