import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findPage, renderApp } from '../../test/renderApp';

describe('reconcile', () => {
  it('redirects to the first account and shows the difference', async () => {
    const { router } = renderApp('/reconcile');
    await findPage('Reconcile');
    expect(router.state.location.pathname).toBe('/reconcile/chk');
    expect(screen.getByText('Chase Total Checking · October 2026')).toBeInTheDocument();
    expect(screen.getByLabelText('Bank balance')).toHaveValue('7993.52');
    expect(screen.getByTestId('cleared-balance')).toHaveTextContent('$8,077.79');
    expect(screen.getByTestId('difference')).toHaveTextContent('−$84.27');
    expect(screen.getByRole('button', { name: 'Sign off reconciliation' })).toBeDisabled();
    expect(screen.getByText('Uncleared items (3)')).toBeInTheDocument();
  });

  it('ticking a cleared item updates the difference live and allows sign-off at $0.00', async () => {
    const { user } = renderApp('/reconcile/chk');
    await findPage('Reconcile');
    await user.click(screen.getByRole('checkbox', { name: "Cleared: Trader Joe's #142" }));
    expect(screen.getByTestId('difference')).toHaveTextContent('$0.00');
    const signOff = screen.getByRole('button', { name: 'Sign off reconciliation' });
    await waitFor(() => expect(signOff).toBeEnabled());

    await user.click(signOff);
    expect(await screen.findByText('Reconciliation signed off')).toBeInTheDocument();
    expect(await screen.findByText(/Reconciled and signed off by Alex Rivera on Oct 7/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Cleared: Shell — Sunset Blvd' })).toBeDisabled();
    expect(screen.getByLabelText('Bank balance')).toBeDisabled();
    expect(within(screen.getByRole('navigation', { name: 'Accounts' })).getByRole('link', { name: /Chase Total Checking/ })).toHaveTextContent('Signed off');

    await user.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(await screen.findByText('Reconciliation reopened')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Bank balance')).toBeEnabled());
  });

  it('recomputes the difference while the bank balance is typed and saves it on blur', async () => {
    const { user } = renderApp('/reconcile/wf');
    await findPage('Reconcile');
    expect(screen.getByTestId('difference')).toHaveTextContent('$0.00');
    const bank = screen.getByLabelText('Bank balance');
    await user.clear(bank);
    await user.type(bank, '3400');
    expect(screen.getByTestId('difference')).toHaveTextContent('−$56.55');
    expect(screen.getByRole('button', { name: 'Sign off reconciliation' })).toBeDisabled();
    await user.tab();
    await waitFor(() =>
      expect(within(screen.getByRole('navigation', { name: 'Accounts' })).getByRole('link', { name: /Wells Fargo/ })).toHaveTextContent('Off by $56.55'),
    );
  });

  it('shows a closed period as read-only', async () => {
    renderApp('/reconcile/chk?period=2026-09');
    await findPage('Reconcile');
    expect(screen.getByText('Chase Total Checking · September 2026')).toBeInTheDocument();
    expect(screen.getByText('This period is closed.')).toBeInTheDocument();
    expect(screen.getByLabelText('Bank balance')).toBeDisabled();
  });

  it('links to add a missing entry for the account', async () => {
    renderApp('/reconcile/wf');
    await findPage('Reconcile');
    expect(screen.getByRole('link', { name: 'Add a missing entry' })).toHaveAttribute('href', '/activity?account=wf');
  });
});
