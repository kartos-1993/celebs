import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import VerifyEmailPage from '../verify-email-page';
import * as authApi from '../../api';

const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams();
const mockRefetch = vi.fn();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams],
  useNavigate: () => mockNavigate,
}));

const mockUseAuthContext = vi.fn();
vi.mock('@/context/auth-provider', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

vi.mock('../../api', () => ({
  verifyEmail: vi.fn(),
}));

describe('VerifyEmailPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('code');
    mockUseAuthContext.mockReturnValue({
      user: null,
      refetch: mockRefetch,
    });
  });

  it('should display error if verification code is missing from search params', async () => {
    render(<VerifyEmailPage />);

    expect(screen.getByText(/Verification Failed/i)).toBeTruthy();
    expect(screen.getByText(/Verification code is missing from the link/i)).toBeTruthy();
    expect(authApi.verifyEmail).not.toHaveBeenCalled();
  });

  it('should call verifyEmail API once and handle successful verification', async () => {
    mockSearchParams.set('code', 'valid-code-123');
    vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({
      data: { success: true, message: 'Verified' },
    } as unknown as Awaited<ReturnType<typeof authApi.verifyEmail>>);

    render(<VerifyEmailPage />);

    expect(screen.getByText(/Verifying Email Address/i)).toBeTruthy();

    await waitFor(() => {
      expect(authApi.verifyEmail).toHaveBeenCalledTimes(1);
      expect(authApi.verifyEmail).toHaveBeenCalledWith({ code: 'valid-code-123' });
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('should skip duplicate API call if user is already email verified', async () => {
    mockSearchParams.set('code', 'valid-code-123');
    mockUseAuthContext.mockReturnValue({
      user: { isEmailVerified: true },
      refetch: mockRefetch,
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Email Verified Successfully/i)).toBeTruthy();
      expect(authApi.verifyEmail).not.toHaveBeenCalled();
    });
  });
});
