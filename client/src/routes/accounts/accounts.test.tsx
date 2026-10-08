import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findPage, renderApp } from '../../test/renderApp';

const card = (name: string) => screen.getByRole('article', { name });

describe('accounts', () => {
  it('shows book balance, bank balance, uncleared items and reconciliation status', async () => {
    renderApp('/accounts');
    await findPage('Accounts');
    const chase = card('Chase Total Checking');
    expect(chase).toHaveTextContent('Checking ••8812 · Primary · bills & groceries');
    expect(chase).toHaveTextContent('$7,727.97');
    expect(chase).toHaveTextContent('Opening (Oct 1)$6,420.18');
    expect(chase).toHaveTextContent('Bank balance (entered)$7,993.52');
    expect(chase).toHaveTextContent('Uncleared items3');
    expect(chase).toHaveTextContent('Bills paid from here5');
    expect(chase).toHaveTextContent('Last reconciledSep 30');
    expect(within(chase).getByText('Off by $84.27')).toBeInTheDocument();
    expect(within(card('Wells Fargo Everyday')).getByText('Ready to sign off')).toBeInTheDocument();
    expect(within(chase).getByRole('link', { name: 'Reconcile' })).toHaveAttribute('href', '/reconcile/chk');
    expect(within(chase).getByRole('link', { name: 'Activity' })).toHaveAttribute('href', '/activity?account=chk');
  });

  it('adds a debit account', async () => {
    const { user } = renderApp('/accounts');
    await findPage('Accounts');
    await user.click(screen.getByRole('link', { name: 'Add account' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a debit account' });
    expect(within(dialog).getByLabelText('Balance as of')).toHaveValue('2026-10-01');
    await user.type(within(dialog).getByLabelText('Account nickname'), 'Joint Checking');
    await user.type(within(dialog).getByLabelText('Bank'), 'Bank of America');
    await user.type(within(dialog).getByLabelText('Last 4 digits'), '4410');
    await user.type(within(dialog).getByLabelText('Opening balance'), '1,250.00');
    await user.click(within(dialog).getByRole('button', { name: 'Add account' }));

    expect(await screen.findByText('Joint Checking added')).toBeInTheDocument();
    const joint = card('Joint Checking');
    expect(joint).toHaveTextContent('Checking ••4410');
    expect(joint).toHaveTextContent('$1,250.00');
    expect(joint).toHaveTextContent('Bank balance (entered)—');
    expect(joint).toHaveTextContent('Last reconciledNever');
    expect(within(joint).getByText('No bank balance')).toBeInTheDocument();
  });

  it('edits an account', async () => {
    const { user } = renderApp('/accounts');
    await findPage('Accounts');
    await user.click(screen.getByRole('link', { name: 'Edit Ally Online Savings' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Ally Online Savings' });
    expect(within(dialog).getByLabelText('Type')).toHaveValue('savings');
    const name = within(dialog).getByLabelText('Account nickname');
    await user.clear(name);
    await user.type(name, 'Ally Emergency Fund');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Ally Emergency Fund updated')).toBeInTheDocument();
    expect(card('Ally Emergency Fund')).toHaveTextContent('$18,250.00');
  });

  it('validates the last 4 digits', async () => {
    const { user } = renderApp('/accounts/new');
    const dialog = await screen.findByRole('dialog', { name: 'Add a debit account' });
    await user.type(within(dialog).getByLabelText('Account nickname'), 'X');
    await user.type(within(dialog).getByLabelText('Bank'), 'Y');
    await user.type(within(dialog).getByLabelText('Last 4 digits'), '12');
    await user.type(within(dialog).getByLabelText('Opening balance'), '0');
    await user.click(within(dialog).getByRole('button', { name: 'Add account' }));
    expect(await within(dialog).findByText('Enter the last 4 digits.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Last 4 digits')).toHaveAttribute('aria-invalid', 'true');
  });
});
