import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findPage, renderApp } from '../../test/renderApp';

describe('overview', () => {
  it('shows close progress, totals and reconciliation status', async () => {
    renderApp('/');
    await findPage(/, Alex$/);
    expect(screen.getByText('Wednesday, October 7, 2026')).toBeInTheDocument();

    const progress = screen.getByRole('region', { name: 'Close progress' });
    expect(within(progress).getByRole('heading', { name: 'October 2026 close' })).toBeInTheDocument();
    expect(within(progress).getByRole('img', { name: '2/10 tasks done' })).toBeInTheDocument();
    expect(within(progress).getByText('24 days left')).toBeInTheDocument();
    expect(within(progress).getByText(/reconcile by Nov 5/)).toBeInTheDocument();

    const kpis = screen.getByRole('region', { name: 'This month' });
    expect(within(kpis).getByText('$2,859.21')).toBeInTheDocument();
    expect(within(kpis).getByText('7 bills · 1 estimated')).toBeInTheDocument();
    expect(within(kpis).getByText('$692.39')).toBeInTheDocument();
    expect(within(kpis).getByText('$11,184.52')).toBeInTheDocument();

    expect(screen.getAllByText('Ready', { selector: '.pill' })).toHaveLength(2);
    expect(screen.getByText('−$84.27')).toBeInTheDocument();
  });

  it('lists upcoming bills by due date and opens the bill panel', async () => {
    const { user, router } = renderApp('/');
    await findPage(/, Alex$/);
    const upcoming = screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/close/2026-10/bills/'));
    expect(upcoming.map((l) => l.getAttribute('href')!.split('/').pop())).toEqual(['verizon', 'toyota', 'ladwp', 'sapphire', 'socal']);
    await user.click(upcoming[2]!);
    expect(await screen.findByRole('dialog', { name: 'LADWP' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/close/2026-10/bills/ladwp');
  });

  it('marks statement, due and paid dates on the calendar', async () => {
    renderApp('/');
    await findPage(/, Alex$/);
    expect(screen.getByTestId('cal-2026-10-03')).toHaveAccessibleName('Oct 3, paid');
    expect(screen.getByTestId('cal-2026-10-07')).toHaveAccessibleName('Oct 7, today');
    expect(screen.getByTestId('cal-2026-10-09')).toHaveAccessibleName('Oct 9, statement date, statement date');
    expect(screen.getByTestId('cal-2026-10-19')).toHaveAccessibleName('Oct 19, due');
    // LADWP is billed in odd months, so no statement closes on Oct 28.
    expect(screen.getByTestId('cal-2026-10-28')).toHaveAccessibleName('Oct 28, due');
  });

  it('adds an expense from the overview', async () => {
    const { user, router } = renderApp('/');
    await findPage(/, Alex$/);
    await user.click(screen.getByRole('link', { name: 'Add expense' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add expense or deposit' });
    await user.type(within(dialog).getByLabelText('Description'), 'Target');
    await user.type(within(dialog).getByLabelText('Amount'), '45.20');
    await user.click(screen.getByRole('button', { name: 'Add entry' }));
    expect(await screen.findByText('Entry added · mark it cleared when it posts')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    // Checking balance drops by the new expense.
    expect(screen.getByText('$11,139.32')).toBeInTheDocument();
  });

  it('shows field errors without closing the modal', async () => {
    const { user } = renderApp('/?new=expense');
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Add entry' }));
    expect(await screen.findByText('Enter a description.')).toBeInTheDocument();
    expect(screen.getByText('Enter an amount greater than $0.00.')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toHaveAttribute('aria-invalid', 'true');
  });
});
