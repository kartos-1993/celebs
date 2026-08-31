import { useMutation } from '@tanstack/react-query';

import { login, logout, resendVerification } from '../api';

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
    meta: { suppressErrorToast: true },
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: logout,
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: resendVerification,
  });
}
