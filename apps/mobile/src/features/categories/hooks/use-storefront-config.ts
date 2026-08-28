import { useQuery } from '@tanstack/react-query';

import { CATEGORY_QUERY_KEYS, getStorefrontConfig } from '../api';

export function useStorefrontConfig(categorySlug: string) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: CATEGORY_QUERY_KEYS.storefront(categorySlug),
    queryFn: () => getStorefrontConfig(categorySlug),
    enabled: !!categorySlug,
    staleTime: __DEV__ ? 0 : 1000 * 60 * 5, // 0s in dev for instant updates, 5 mins in prod
  });

  return {
    storefrontConfig: data,
    loading: isLoading,
    isError,
    refetch,
  };
}
