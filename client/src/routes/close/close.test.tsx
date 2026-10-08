import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findPage, renderApp } from '../../test/renderApp';

const row = (name: string) => screen.getByRole('link', { name: new RegExp(`^${name}`) }).closest('tr')!;

describe('monthly close', () => {
  it('redirects /close to the current period and lists bills due that month', async () => {
    const { router } = renderApp('/close');
    await findPage('Monthly close');
    expect(router.state.location.pathname).toBe('/close/2026-10');
    expect(screen.getByRole('heading', { name: 'Close checklist · October 2026' })).toBeInTheDocument();
    expect(within(row('Spectrum')).getByText('Paid')).toBeInTheDocument();
    expect(within(row('LADWP')).getByText('Statement entered')).toBeInTheDocument();
    expect(within(row('SoCalGas')).getByText('Expected Oct 9')).toBeInTheDocument();
    expect(within(row('Toyota Financial')).getByText('No statement')).toBeInTheDocument();
    expect(within(row('Verizon Wireless')).getByText('Autopay Oct 15')).toBeInTheDocument();
    expect(within(row('Reconcile Chase Total Checking')).getByText('Difference')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lock period' })).toBeDisabled();
    expect(screen.getByRole('link', { name: /Monthly close/ })).toHaveTextContent('5');
  });

  it('shows off-cycle bills instead of missing ones', async () => {
    renderApp('/close/2026-11');
    await findPage('Monthly close');
    const ladwp = screen.getByText('LADWP').closest('tr')!;
    expect(within(ladwp).getByText('Off-cycle')).toBeInTheDocument();
    expect(within(ladwp).getByText(/next statement Nov 28, due Dec 19/)).toBeInTheDocument();
    expect(screen.getByText('6 bills · 1 off-cycle')).toBeInTheDocument();
    expect(screen.getByText(/Upcoming period/)).toBeInTheDocument();
  });

  it('enters a statement: awaiting → entered', async () => {
    const { user } = renderApp('/close/2026-10');
    await findPage('Monthly close');
    await user.click(row('SoCalGas'));
    const drawer = await screen.findByRole('dialog', { name: 'SoCalGas' });
    expect(within(drawer).getByText(/Pre-filled with the typical amount/)).toBeInTheDocument();
    const amount = within(drawer).getByLabelText('Statement amount');
    await user.clear(amount);
    await user.type(amount, '38.62');
    await user.click(within(drawer).getByRole('button', { name: 'Save statement' }));
    expect(await screen.findByText('SoCalGas statement saved')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(row('SoCalGas')).getByText('Statement entered')).toBeInTheDocument();
    expect(within(row('SoCalGas')).getByText('$38.62')).toBeInTheDocument();
  });

  it('records a payment and adds it to the paying account', async () => {
    const { user } = renderApp('/close/2026-10/bills/sapphire');
    const drawer = await screen.findByRole('dialog', { name: 'Chase Sapphire Preferred' });
    expect(within(drawer).getByLabelText('Statement amount')).toHaveValue('1284.55');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));
    expect(await screen.findByText('Chase Sapphire Preferred marked paid · added to Chase ••8812 activity')).toBeInTheDocument();
    expect(within(row('Chase Sapphire Preferred')).getByText('Paid')).toBeInTheDocument();
    expect(within(row('Chase Sapphire Preferred')).getByRole('img', { name: 'Signed off by AR' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Monthly close/ })).toHaveTextContent('4');

    await user.click(screen.getByRole('link', { name: /Expenses & payments/ }));
    await findPage('Expenses & payments');
    const payment = screen.getByText('Chase Sapphire Preferred — payment').closest('tr')!;
    expect(within(payment).getByText('−$1,284.55')).toBeInTheDocument();
    expect(within(payment).getByText(/Linked to Chase Sapphire Preferred · October close/)).toBeInTheDocument();
  });

  it('pays a card bill at its minimum due', async () => {
    const { user } = renderApp('/close/2026-10/bills/sapphire');
    const drawer = await screen.findByRole('dialog', { name: 'Chase Sapphire Preferred' });
    await user.type(within(drawer).getByLabelText('Minimum due'), '40');
    await user.click(within(drawer).getByRole('button', { name: 'Minimum' }));
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));
    await screen.findByText(/marked paid/);
    await user.click(screen.getByRole('link', { name: /Expenses & payments/ }));
    await findPage('Expenses & payments');
    expect(screen.getByText('Chase Sapphire Preferred — payment').closest('tr')).toHaveTextContent('−$40.00');
  });

  it('schedules a payment', async () => {
    const { user } = renderApp('/close/2026-10/bills/ladwp');
    const drawer = await screen.findByRole('dialog', { name: 'LADWP' });
    await user.click(within(drawer).getByRole('button', { name: 'Schedule' }));
    expect(await screen.findByText('LADWP payment scheduled')).toBeInTheDocument();
    expect(within(row('LADWP')).getByText('Payment scheduled')).toBeInTheDocument();
  });

  it('records one amount per service line with a live total', async () => {
    const { user } = renderApp('/close/2026-10/bills/ladwp');
    const drawer = await screen.findByRole('dialog', { name: 'LADWP' });
    expect(within(drawer).getByLabelText('Service from')).toHaveValue('2026-07-25');
    const total = within(drawer).getByRole('status', { name: 'Statement total' });
    expect(total).toHaveTextContent('$286.73');
    const water = within(drawer).getByLabelText('Water');
    await user.clear(water);
    await user.type(water, '80.00');
    expect(total).toHaveTextContent('$292.62');
    await user.click(within(drawer).getByRole('button', { name: 'Save statement' }));
    await screen.findByText('LADWP statement saved');
    expect(within(row('LADWP')).getByText('$292.62')).toBeInTheDocument();
  });

  it('shows the loan balance and payoff month', async () => {
    renderApp('/close/2026-10/bills/toyota');
    const drawer = await screen.findByRole('dialog', { name: 'Toyota Financial' });
    const loan = within(drawer).getByRole('region', { name: 'Loan' });
    expect(loan).toHaveTextContent('Payments left23');
    expect(loan).toHaveTextContent('$9,486.12');
    expect(loan).toHaveTextContent('Sep 2028');
    expect(within(drawer).getByText(/Autopay is on/)).toBeInTheDocument();
  });

  it('validates the drawer and keeps it open', async () => {
    const { user } = renderApp('/close/2026-10/bills/socal');
    const drawer = await screen.findByRole('dialog', { name: 'SoCalGas' });
    const amount = within(drawer).getByLabelText('Statement amount');
    await user.clear(amount);
    await user.type(amount, 'abc');
    await user.click(within(drawer).getByRole('button', { name: 'Save statement' }));
    expect(await within(drawer).findByText('Enter an amount of $0.00 or more.')).toBeInTheDocument();
  });

  it('closes the drawer with Escape and returns to the checklist', async () => {
    const { user, router } = renderApp('/close/2026-10/bills/ladwp');
    await screen.findByRole('dialog', { name: 'LADWP' });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/close/2026-10');
  });

  it('keeps a closed month read-only until it is reopened', async () => {
    const { user } = renderApp('/close/2026-09');
    await findPage('Monthly close');
    expect(screen.getByText(/Closed Oct 4 · signed off by Alex Rivera/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'September ✓' })).toHaveAttribute('aria-current', 'page');
    await user.click(row('Amex Blue Cash Everyday'));
    const drawer = await screen.findByRole('dialog', { name: 'Amex Blue Cash Everyday' });
    expect(within(drawer).getByLabelText('Statement amount')).toBeDisabled();
    expect(within(drawer).queryByRole('button', { name: 'Record payment' })).not.toBeInTheDocument();
    await user.click(within(drawer).getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reopen period' }));
    expect(await screen.findByText('September 2026 reopened')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lock period' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Lock period' }));
    expect(await screen.findByText('September 2026 locked')).toBeInTheDocument();
  });
});
