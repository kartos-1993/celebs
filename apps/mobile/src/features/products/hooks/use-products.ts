import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { getProductById, getProducts, PRODUCT_QUERY_KEYS } from '../api';
import type { Product, ProductFilterParams } from '../types';

import { isNonRetryableApiError } from '@/api/response';

export { PRODUCT_QUERY_KEYS } from '../api';
export type {
  Product,
  ProductColorVariant,
  ProductFilterParams,
  ProductMeasurement,
  ProductSize,
  ProductSku,
  ProductStock,
  ProductVariantOption,
} from '../types';

/**
 * Keep the window bounded so a runaway catalog cannot exhaust memory, but never
 * let the cap look like the end of the catalog: `hasNextPage` staying true with
 * every page full is the signal that results were truncated.
 */
const MAX_PAGES = 4;
const MAX_RETRIES = 3;

const retryUnlessDefinitive = (failureCount: number, error: unknown): boolean =>
  failureCount < MAX_RETRIES && !isNonRetryableApiError(error);

export function useProducts(
  limitOrParams: number | ProductFilterParams = 10,
  categorySlugOrId?: string,
) {
  const params: ProductFilterParams = useMemo(() => {
    if (typeof limitOrParams === 'number') {
      return {
        limit: limitOrParams,
        category: categorySlugOrId,
      };
    }
    return {
      limit: 10,
      ...limitOrParams,
    };
  }, [limitOrParams, categorySlugOrId]);

  const queryKey = useMemo(() => {
    return PRODUCT_QUERY_KEYS.list(params);
  }, [params]);

  const { data, isLoading, isFetchingNextPage, hasNextPage, isFetching, fetchNextPage, refetch } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam = null }: { pageParam: string | null }) =>
        getProducts({
          ...params,
          cursor: pageParam,
        }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) =>
        // The server flag wins: a stale cursor on a page that says there is no
        // more must not keep paginating past the end of the catalog.
        lastPage.hasMore === false ? null : (lastPage.nextCursor ?? null),
      maxPages: MAX_PAGES,
      staleTime: 1000 * 60 * 2,
      retry: retryUnlessDefinitive,
    });

  const products: Product[] = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.products);
  }, [data]);

  // The window is full and the server still has pages: the user is seeing a
  // truncated slice, not the whole catalog. Surfaced so the UI can say so.
  const isResultsCapped = Boolean(data?.pages && data.pages.length >= MAX_PAGES && hasNextPage);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    products,
    loading: isLoading,
    loadingMore: isFetchingNextPage,
    hasMore: !!hasNextPage,
    resultsCapped: isResultsCapped,
    loadMore,
    refetch,
    refreshing: isFetching,
  };
}

export function useProduct(id: string) {
  const queryClient = useQueryClient();

  const {
    data: product,
    isLoading: loading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: PRODUCT_QUERY_KEYS.detail(id),
    queryFn: () => getProductById(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    retry: retryUnlessDefinitive,
    placeholderData: () => {
      // Look up product in any cached products lists (infinite query pages or direct lists)
      const listQueries = queryClient.getQueriesData<{
        pages?: { products?: Product[] }[];
        products?: Product[];
      }>({
        queryKey: PRODUCT_QUERY_KEYS.lists(),
      });

      for (const [, cache] of listQueries) {
        if (!cache) continue;
        if (Array.isArray(cache.pages)) {
          for (const page of cache.pages) {
            const hit = page.products?.find((p) => String(p.id) === String(id));
            if (hit) return hit;
          }
        }
        if (Array.isArray(cache.products)) {
          const hit = cache.products.find((p) => String(p.id) === String(id));
          if (hit) return hit;
        }
      }
      return undefined;
    },
  });

  return {
    product: product ?? null,
    loading: loading && !product,
    error: error ? (error instanceof Error ? error.message : 'Failed to load product') : null,
    refetch,
    refreshing: isFetching,
  };
}
