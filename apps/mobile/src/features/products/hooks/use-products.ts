import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { getProductById, getProducts, PRODUCT_QUERY_KEYS } from '../api';
import type { Product, ProductFilterParams } from '../types';

export { PRODUCT_QUERY_KEYS } from '../api';
export type {
  Product,
  ProductColorVariant,
  ProductFilterParams,
  ProductMeasurement,
  ProductSize,
  ProductStock,
  ProductVariantOption,
} from '../types';
export { resolveImageUrl } from '@/constants/config';

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

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam = null }: { pageParam: string | null }) =>
        getProducts({
          ...params,
          cursor: pageParam,
        }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => {
        return lastPage.nextCursor ?? null;
      },
      maxPages: 4,
      staleTime: 1000 * 60 * 2,
    });

  const products: Product[] = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.products ?? []);
  }, [data]);

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
    loadMore,
    refetch,
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
    placeholderData: () => {
      // Look up product in any cached products lists (infinite query pages or direct lists)
      const listQueries = queryClient.getQueriesData<{
        pages?: { products?: Product[] }[];
        products?: Product[];
      }>({
        queryKey: ['products', 'list'],
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
