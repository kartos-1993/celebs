import { useQuery } from '@tanstack/react-query';

import { AUTH_QUERY_KEYS, getSetupStatus } from '../api';

export function useSetupStatus() {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.setupStatus(),
    queryFn: getSetupStatus,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    meta: {
      suppressErrorToast: true,
    },
  });
}
