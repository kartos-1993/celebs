import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLogout } from '../use-logout';

import { ACCOUNT_QUERY_KEYS } from '@/features/account/api';
import { logout } from '@/features/auth/api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/features/auth/api', () => ({
  logout: vi.fn(),
}));

function makeHarness() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('useLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lands on /login with the signed-out notice even when the logout request fails', async () => {
    vi.mocked(logout).mockRejectedValue({ status: 401, message: 'Unauthorized' });
    const { queryClient, wrapper } = makeHarness();
    queryClient.setQueryData(ACCOUNT_QUERY_KEYS.userSession(), { id: 'session-1' });

    const { result } = renderHook(() => useLogout(), { wrapper });
    result.current.mutate();

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { notice: 'signed-out' } }),
    );
    expect(queryClient.getQueryData(ACCOUNT_QUERY_KEYS.userSession())).toBeNull();
  });

  it('redirects and clears cached data on a successful logout', async () => {
    vi.mocked(logout).mockResolvedValue({ data: { success: true } } as never);
    const { queryClient, wrapper } = makeHarness();
    queryClient.setQueryData(['products', 'list'], [{ id: 'p1' }]);

    const { result } = renderHook(() => useLogout(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(queryClient.getQueryData(['products', 'list'])).toBeUndefined();
  });
});
