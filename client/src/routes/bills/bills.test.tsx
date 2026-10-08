import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findPage, renderApp } from '../../test/renderApp';

const billRow = (name: string) => screen.getByText(name, { selector: '.nm, .nm *' }).closest('tr')!;

describe('recurring bills', () => {
  it('groups bills by type with their cycle, due rule and paying account', async () => {
    renderApp('/bills');
    await findPage('Recurring bills');
    const kpis = screen.getAllByRole('region')[0]!;
    expect(kpis).toHaveTextContent('Recurring bills7');
    expect(kpis).toHaveTextContent('9 services tracked');
    expect(kpis).toHaveTextContent('$2,565.35');
    expect(kpis).toHaveTextContent('9 · 18 · 22 · 26 · 28');

    const ladwp = billRow('LADWP');
    expect(ladwp).toHaveTextContent('Every 2 months');
    expect(ladwp).toHaveTextContent('Odd months (Jan, Mar, May…)');
    expect(ladwp).toHaveTextContent('21 days after statement');
    expect(within(ladwp).getAllByText(/Electricity|Water|Trash pickup/)).toHaveLength(3);
    expect(billRow('Spectrum')).toHaveTextContent('Day 3 of next month');
    expect(billRow('Toyota Financial')).toHaveTextContent('None');
    expect(billRow('Verizon Wireless')).toHaveTextContent('Autopay');
    expect(screen.getAllByRole('row', { name: /Utilities|Internet & mobile|Credit cards|Installment loans/ })).toHaveLength(4);
  });

  it('filters by type', async () => {
    const { user } = renderApp('/bills');
    await findPage('Recurring bills');
    await user.click(screen.getByRole('link', { name: 'Credit cards' }));
    await waitFor(() => expect(screen.queryByText('LADWP')).not.toBeInTheDocument());
    expect(screen.getByText('Amex Blue Cash Everyday')).toBeInTheDocument();
  });

  it('adds a bill that covers several services', async () => {
    const { user, router } = renderApp('/bills');
    await findPage('Recurring bills');
    await user.click(screen.getByRole('link', { name: 'Add bill' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a recurring bill' });
    await user.type(within(dialog).getByLabelText('Biller name'), 'City of Glendale');
    await user.click(within(dialog).getByRole('button', { name: 'Water' }));
    await user.click(within(dialog).getByRole('button', { name: 'Sewer' }));
    expect(within(dialog).getByRole('button', { name: 'Electricity' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(dialog).getByRole('button', { name: 'Electricity' }));
    await user.selectOptions(within(dialog).getByLabelText('How often'), 'quarterly');
    await user.selectOptions(within(dialog).getByLabelText('Billed in'), '2');
    await user.type(within(dialog).getByLabelText('Statement day'), '12');
    await user.selectOptions(within(dialog).getByLabelText('Due'), 'days-after-statement');
    await user.type(within(dialog).getByLabelText('Due day / days after'), '25');
    await user.type(within(dialog).getByLabelText('Typical amount'), '96.40');
    await user.click(within(dialog).getByRole('button', { name: 'Add bill' }));

    expect(await screen.findByText('City of Glendale added to recurring bills')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/bills');
    const row = billRow('City of Glendale');
    expect(row).toHaveTextContent('Quarterly');
    expect(row).toHaveTextContent('Feb, May, Aug, Nov');
    expect(row).toHaveTextContent('25 days after statement');
    expect(row).toHaveTextContent('WaterSewer');
  });

  it('a new bill joins the close checklist in the months it is due', async () => {
    const { user } = renderApp('/bills/new');
    const dialog = await screen.findByRole('dialog', { name: 'Add a recurring bill' });
    await user.click(within(dialog).getByRole('button', { name: 'Internet & mobile' }));
    await user.type(within(dialog).getByLabelText('Biller name'), 'Mint Mobile');
    await user.type(within(dialog).getByLabelText('Statement day'), '1');
    await user.type(within(dialog).getByLabelText('Due day / days after'), '20');
    await user.type(within(dialog).getByLabelText('Typical amount'), '30');
    await user.click(within(dialog).getByRole('button', { name: 'Add bill' }));
    await screen.findByText('Mint Mobile added to recurring bills');

    await user.click(screen.getByRole('link', { name: /Monthly close/ }));
    await findPage('Monthly close');
    const row = screen.getByRole('link', { name: /^Mint Mobile/ }).closest('tr')!;
    expect(row).toHaveTextContent('Expected Oct 1');
    expect(row).toHaveTextContent('Oct 20');
    expect(row).toHaveTextContent('Awaiting statement');
  });

  it('edits a bill', async () => {
    const { user } = renderApp('/bills');
    await findPage('Recurring bills');
    await user.click(screen.getByRole('link', { name: 'Edit LADWP' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit LADWP' });
    expect(within(dialog).getByLabelText('Biller name')).toHaveValue('LADWP');
    expect(within(dialog).getByLabelText('Billed in')).toHaveDisplayValue('Odd months (Jan, Mar, May…)');
    expect(within(dialog).getByLabelText('Due')).toHaveValue('days-after-statement');
    await user.click(within(dialog).getByRole('button', { name: 'Sewer' }));
    await user.click(within(dialog).getByLabelText('Autopay is on'));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('LADWP updated')).toBeInTheDocument();
    expect(billRow('LADWP')).toHaveTextContent('Sewer');
    expect(billRow('LADWP')).toHaveTextContent('Autopay');
  });

  it('edits a loan with its balance and payments left', async () => {
    renderApp('/bills/toyota/edit');
    const dialog = await screen.findByRole('dialog', { name: 'Edit Toyota Financial' });
    expect(within(dialog).getByLabelText('Monthly payment')).toHaveValue('412.36');
    expect(within(dialog).getByLabelText('Current balance')).toHaveValue('9486.12');
    expect(within(dialog).getByLabelText('Payments left')).toHaveValue(23);
    expect(within(dialog).getByLabelText('Statement day')).toHaveAttribute('placeholder', 'Optional');
  });

  it('shows field errors and keeps the form open', async () => {
    const { user } = renderApp('/bills/new');
    const dialog = await screen.findByRole('dialog', { name: 'Add a recurring bill' });
    await user.click(within(dialog).getByRole('button', { name: 'Add bill' }));
    expect(await within(dialog).findByText('Enter the biller name.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a statement day from 1 to 31.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a due day from 1 to 31.')).toBeInTheDocument();
  });
});
