import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findPage, renderApp } from '../../test/renderApp';

const rows = () => screen.getAllByRole('row').slice(1);

describe('expenses & payments', () => {
  it('lists the period activity newest first with totals', async () => {
    renderApp('/activity');
    await findPage('Expenses & payments');
    expect(rows()).toHaveLength(9);
    expect(rows()[0]).toHaveTextContent('Costco Wholesale');
    const kpis = screen.getByRole('region', { name: 'Activity totals' });
    expect(within(kpis).getByText('$3,850.00')).toBeInTheDocument();
    expect(within(kpis).getByText('−$1,190.21')).toBeInTheDocument();
    expect(within(kpis).getByText('−$692.39')).toBeInTheDocument();
    expect(screen.getByText(/Linked to Spectrum · October close/)).toBeInTheDocument();
  });

  it('filters by account', async () => {
    const { user, router } = renderApp('/activity');
    await findPage('Expenses & payments');
    await user.click(screen.getByRole('link', { name: 'Wells Fargo ••2290' }));
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(router.state.location.search).toBe('?account=wf');
    expect(screen.getByRole('link', { name: 'Wells Fargo ••2290' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Account')).toHaveValue('wf');
  });

  it('quick-adds an expense to the selected account', async () => {
    const { user } = renderApp('/activity?account=chk');
    await findPage('Expenses & payments');
    await user.type(screen.getByLabelText('Description'), 'Ralphs groceries');
    await user.type(screen.getByLabelText('Amount'), '45.20');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Entry added · mark it cleared when it posts')).toBeInTheDocument();
    const row = (await screen.findByText('Ralphs groceries')).closest('tr')!;
    expect(row).toHaveTextContent('−$45.20');
    expect(row).toHaveTextContent('Groceries');
    expect(within(row).getByRole('checkbox')).not.toBeChecked();
    // The form resets for the next entry.
    expect(screen.getByLabelText('Description')).toHaveValue('');
  });

  it('records a deposit as money in', async () => {
    const { user } = renderApp('/activity');
    await findPage('Expenses & payments');
    await user.click(screen.getByRole('button', { name: 'Deposit' }));
    await user.type(screen.getByLabelText('Description'), 'Tax refund');
    await user.selectOptions(screen.getByLabelText('Category'), 'Refund');
    await user.type(screen.getByLabelText('Amount'), '210');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect((await screen.findByText('Tax refund')).closest('tr')).toHaveTextContent('+$210.00');
  });

  it('records a transfer on both accounts', async () => {
    const { user } = renderApp('/activity');
    await findPage('Expenses & payments');
    await user.click(screen.getByRole('button', { name: 'Transfer' }));
    await user.selectOptions(screen.getByLabelText('To'), 'ally');
    await user.type(screen.getByLabelText('Amount'), '500');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await screen.findByText('Transfer to Ally Bank ••5017');
    const [incoming, outgoing] = rows();
    expect(incoming).toHaveTextContent('Transfer from Chase ••8812');
    expect(incoming).toHaveTextContent('Ally Bank ••5017+$500.00');
    expect(outgoing).toHaveTextContent('Transfer to Ally Bank ••5017');
    expect(outgoing).toHaveTextContent('Chase ••8812−$500.00');
  });

  it('toggles the cleared flag', async () => {
    const { user } = renderApp('/activity');
    await findPage('Expenses & payments');
    const box = screen.getByRole('checkbox', { name: 'Cleared: Costco Wholesale' });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
    const kpis = screen.getByRole('region', { name: 'Activity totals' });
    await waitFor(() => expect(within(kpis).getByText('Not yet cleared').parentElement).toHaveTextContent('2'));
  });

  it('shows validation errors', async () => {
    const { user } = renderApp('/activity');
    await findPage('Expenses & payments');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Enter a description.')).toBeInTheDocument();
    expect(screen.getByText('Enter an amount greater than $0.00.')).toBeInTheDocument();
  });
});
