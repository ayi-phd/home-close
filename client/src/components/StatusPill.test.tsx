import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it.each([
    ['awaiting', 'Awaiting statement'],
    ['entered', 'Statement entered'],
    ['scheduled', 'Payment scheduled'],
    ['paid', 'Paid'],
    ['offcycle', 'Off-cycle'],
  ] as const)('renders %s', (status, label) => {
    render(<StatusPill status={status} />);
    expect(screen.getByText(label)).toHaveClass('pill', status);
  });
});
