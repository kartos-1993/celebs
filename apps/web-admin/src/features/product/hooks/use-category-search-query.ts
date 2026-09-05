import { useQuery } from '@tanstack/react-query';

import { searchDropdownCategories } from '../api';

import { PRODUCT_QUERY_KEYS } from './use-product-queries';

/**
 * Debounced server-side category search for the cascading dropdown.
 * Pass the already-debounced query; the request fires only for non-blank
 * input and the previous page is kept while refetching.
 */
export function useCategorySearchQuery(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.categorySearch(trimmed),
    queryFn: () => searchDropdownCategories(trimmed),
    enabled: enabled && trimmed.length > 0,
    staleTime: 60 * 1000,
  });
}
