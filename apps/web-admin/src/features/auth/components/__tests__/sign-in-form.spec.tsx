import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SignInForm } from '../sign-in-form';

const mockLocation: { search: string; state?: unknown } = { search: '', state: undefined };

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) =>
    React.createElement('a', { href: to }, children),
  useNavigate: () => vi.fn(),
  useLocation: () => mockLocation,
}));

vi.mock('../../hooks/use-auth-mutations', () => ({
  useLoginMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/account/api', () => ({
  ACCOUNT_QUERY_KEYS: { all: ['account'], userSession: () => ['account', 'user-session'] },
  getUserSession: vi.fn(),
}));

vi.mock('../setup-required-banner', () => ({
  SetupRequiredBanner: () => null,
}));

function renderForm() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SignInForm />
    </QueryClientProvider>,
  );
}

describe('SignInForm sign-out notice', () => {
  beforeEach(() => {
    mockLocation.state = undefined;
  });

  it('shows a quiet notice after an intentional sign-out', () => {
    mockLocation.state = { notice: 'signed-out' };

    renderForm();

    expect(screen.getByText('You have been signed out.')).toBeTruthy();
  });

  it('shows no notice on a plain visit to /login', () => {
    renderForm();

    expect(screen.queryByText('You have been signed out.')).toBeNull();
  });
});
