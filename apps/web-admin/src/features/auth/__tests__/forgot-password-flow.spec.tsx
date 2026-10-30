import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '../api';
import { ForgotPasswordForm } from '../components/forgot-password-form';
import { ResetPasswordForm } from '../components/reset-password-form';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) =>
    React.createElement('a', { href: to }, children),
  useNavigate: () => mockNavigate,
}));

vi.mock('../api', () => ({
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  AUTH_QUERY_KEYS: {
    all: ['auth'],
    setupStatus: () => ['auth', 'setup-status'],
  },
}));

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Forgot and Reset Password Flow Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ForgotPasswordForm', () => {
    it('submits email and renders success message upon successful response', async () => {
      vi.mocked(authApi.forgotPassword).mockResolvedValueOnce({
        success: true,
        message: 'Reset email sent',
      } as never);

      render(<ForgotPasswordForm />, { wrapper: createTestWrapper() });

      const emailInput = screen.getByPlaceholderText('name@example.com');
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.forgotPassword).toHaveBeenCalledTimes(1);
        expect(authApi.forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' });
      });

      await waitFor(() => {
        expect(screen.getByText('Password Reset Link Sent')).toBeTruthy();
        expect(screen.getByText(/user@example.com/)).toBeTruthy();
      });
    });

    it('renders server error banner when API call fails', async () => {
      vi.mocked(authApi.forgotPassword).mockRejectedValueOnce(new Error('Network Error'));

      render(<ForgotPasswordForm />, { wrapper: createTestWrapper() });

      const emailInput = screen.getByPlaceholderText('name@example.com');
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
      });
    });
  });

  describe('ResetPasswordForm', () => {
    it('renders error notice when reset code is missing', () => {
      render(<ResetPasswordForm code={null} />, { wrapper: createTestWrapper() });

      expect(screen.getByText('Invalid or Missing Reset Link')).toBeTruthy();
      expect(
        screen.getByText(
          'This password reset link is invalid or incomplete. Please request a new link.',
        ),
      ).toBeTruthy();
      expect(authApi.resetPassword).not.toHaveBeenCalled();
    });

    it('submits valid passwords and navigates to login with success state', async () => {
      vi.mocked(authApi.resetPassword).mockResolvedValueOnce({
        success: true,
        message: 'Password reset',
      } as never);

      render(<ResetPasswordForm code="valid-test-code-123" />, {
        wrapper: createTestWrapper(),
      });

      const inputs = screen.getAllByPlaceholderText('••••••••');
      const newPasswordInput = inputs[0];
      const confirmPasswordInput = inputs[1];
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'NewSecurePassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'NewSecurePassword123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.resetPassword).toHaveBeenCalledTimes(1);
        expect(authApi.resetPassword).toHaveBeenCalledWith({
          verificationCode: 'valid-test-code-123',
          password: 'NewSecurePassword123!',
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: {
            successMessage: 'Your password has been reset successfully. Please log in.',
          },
        });
      });
    });
  });
});
