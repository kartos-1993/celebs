import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ACCOUNT_QUERY_KEYS } from '@/features/account/api';
import { logout as logoutApi } from '@/features/auth/api';

/**
 * The single intentional sign-out path.
 *
 * `suppressErrorToast` (honored by the query/mutation caches in main.tsx):
 * signing out must never surface an error toast — a dead session or a failed
 * request still means the user is leaving on purpose. Cleanup + redirect run in
 * `onSettled`, so the user always lands on the login page, which shows the
 * quiet "signed out" notice carried in router state.
 */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutApi,
    meta: { suppressErrorToast: true },
    onSettled: () => {
      queryClient.setQueryData(ACCOUNT_QUERY_KEYS.userSession(), null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== ACCOUNT_QUERY_KEYS.all[0],
      });
      const currentPath = window.location.pathname + window.location.search;
      const isInsideApp = currentPath && currentPath !== '/' && currentPath !== '/login';
      const returnUrl = isInsideApp ? `?returnUrl=${encodeURIComponent(currentPath)}` : '';
      navigate(`/login${returnUrl}`, { state: { notice: 'signed-out' } });
    },
  });
}
