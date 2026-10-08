import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findPage, renderApp } from '../test/renderApp';

describe('login and sign-up (UI only)', () => {
  it('signing in with any input goes into the app', async () => {
    const { user, router } = renderApp('/login');
    await findPage(/close your household books/i);
    expect(screen.getByText(/sign-in is not connected yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await findPage(/, Alex$/);
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByText('Signed in as Alex Rivera')).toBeInTheDocument();
  });

  it('links between sign-in and sign-up', async () => {
    const { user } = renderApp('/login');
    await user.click(await screen.findByRole('link', { name: 'Create an account' }));
    expect(await screen.findByRole('heading', { name: 'Create your household' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('sign-up continues into the app with the new household', async () => {
    const { user } = renderApp('/signup');
    await user.type(await screen.findByLabelText('First name'), 'Sam');
    await user.type(screen.getByLabelText('Last name'), 'Lee');
    await user.type(screen.getByLabelText('Household name'), 'Lee Household');
    expect(screen.getByLabelText('Start closing from')).toHaveDisplayValue('October 2026');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await findPage(/, Sam$/);
    expect(screen.getByText('Lee Household')).toBeInTheDocument();
    expect(screen.getByText('Household created')).toBeInTheDocument();
  });

  it('signing out returns to the login screen', async () => {
    const { user } = renderApp('/');
    await user.click(await screen.findByRole('link', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
