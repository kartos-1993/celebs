import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AUTH_QUERY_KEYS, login, resendVerification, setupSuperadmin } from '../api';

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
    meta: { suppressErrorToast: true },
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: resendVerification,
  });
}

export function useSetupSuperadminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setupSuperadmin,
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.setupStatus() });
    },
  });
}
