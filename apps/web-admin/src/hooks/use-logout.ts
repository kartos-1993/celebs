import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ACCOUNT_QUERY_KEYS } from '@/features/account/api';
import { logout as logoutApi } from '@/features/auth/api';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.setQueryData(ACCOUNT_QUERY_KEYS.userSession(), null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== ACCOUNT_QUERY_KEYS.all[0],
      });
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath && currentPath !== '/' && currentPath !== '/login') {
        const returnUrl = encodeURIComponent(currentPath);
        navigate(`/login?returnUrl=${returnUrl}`);
      } else {
        navigate('/login');
      }
    },
  });
}
