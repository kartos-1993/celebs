import { useQuery } from '@tanstack/react-query';
import { getUserSession } from '@/features/account/api';
import { ACCOUNT_QUERY_KEYS } from '@/features/account/hooks/use-account-queries';

const useAuth = () => {
  const query = useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.userSession(),
    queryFn: getUserSession,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    meta: {
      suppressErrorToast: true,
    },
  });
  return query;
};

export default useAuth;
