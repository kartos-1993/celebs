import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getProductById, getProducts, PRODUCT_QUERY_KEYS } from '../api';

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

export function useProducts(initialLimit = 10, categorySlugOrId?: string) {
  const queryKey = useMemo(() => {
    return categorySlugOrId
      ? PRODUCT_QUERY_KEYS.list({ limit: initialLimit, category: categorySlugOrId })
      : PRODUCT_QUERY_KEYS.list({ limit: initialLimit });
  }, [initialLimit, categorySlugOrId]);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam = null }: { pageParam: string | null }) =>
        getProducts({
          limit: initialLimit,
          category: categorySlugOrId,
          cursor: pageParam,
        }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => {
        if (lastPage?.success && lastPage?.data) {
          const rawProducts = Array.isArray(lastPage.data.products)
            ? lastPage.data.products
            : Array.isArray(lastPage.data)
              ? lastPage.data
              : [];

          const serverCursor = lastPage.data.nextCursor || null;
          const serverHasMore =
            typeof lastPage.data.hasMore === 'boolean'
              ? lastPage.data.hasMore
              : rawProducts.length >= initialLimit && Boolean(serverCursor);

          return serverHasMore ? serverCursor : null;
        }
        return null;
      },
      staleTime: 1000 * 30, // 30 seconds
      refetchOnMount: 'always',
    });

  const products = useMemo(() => {
    if (!data) return [];
    const allProducts = data.pages.flatMap((page) => {
      if (!page) return [];
      if (Array.isArray(page)) return page;
      if (page.success && page.data) {
        if (Array.isArray(page.data.products)) return page.data.products;
        if (Array.isArray(page.data)) return page.data;
      }
      if (page.data && Array.isArray(page.data.products)) return page.data.products;
      if (Array.isArray(page.products)) return page.products;
      return [];
    });
    const seen = new Set<string>();
    return allProducts.filter((product) => {
      if (!product?.id || seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
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
    enabled: !!id,
    staleTime: 1000 * 30, // 30 seconds
  });

  return { product: product || null, loading, error: error?.message || null };
}
