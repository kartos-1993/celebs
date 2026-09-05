import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

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
        return lastPage?.data?.nextCursor ?? null;
      },
      maxPages: 4,
      staleTime: 1000 * 60 * 2,
    });

  const products: Product[] = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => {
      if (Array.isArray(page?.data?.products)) return page.data.products;
      if (Array.isArray(page?.data)) return page.data;
      if (Array.isArray(page?.products)) return page.products;
      return [];
    });
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
  const {
    data: product,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: PRODUCT_QUERY_KEYS.detail(id),
    queryFn: () => getProductById(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
  });

  return {
    product: product ?? null,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load product') : null,
  };
}
