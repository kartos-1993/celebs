import { useQuery } from '@tanstack/react-query';

import { getUserSession } from '@/features/account/api';
import { ACCOUNT_QUERY_KEYS } from '@/features/account/api';

const useAuth = () => {
  const query = useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.userSession(),
    queryFn: getUserSession,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
    meta: {
      suppressErrorToast: true,
    },
  });
  return query;
};

export default useAuth;
