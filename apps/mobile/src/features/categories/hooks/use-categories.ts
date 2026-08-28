import { useQuery } from '@tanstack/react-query';

import { CATEGORY_QUERY_KEYS, getCategoriesTree } from '../api';
import type { Category } from '../types';

export type { Category };

export function useCategories() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: CATEGORY_QUERY_KEYS.tree(),
    queryFn: getCategoriesTree,
    staleTime: __DEV__ ? 0 : 1000 * 60 * 5, // 0s in dev for instant updates, 5 mins in prod
  });

  return {
    categories: data || [],
    loading: isLoading,
    refetch,
  };
}
