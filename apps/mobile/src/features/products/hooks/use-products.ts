import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { resolveImageUrl } from '@/constants/config';
export { resolveImageUrl };

export interface ProductMeasurement {
  name: string;
  value: string;
  unit: string;
}

export interface ProductSize {
  name: string;
  productMeasurements?: ProductMeasurement[];
  bodyMeasurements?: ProductMeasurement[];
}

export interface ProductStock {
  size: string;
  quantity: number;
}

export interface ProductColorVariant {
  name: string;
  colorCode: string;
  images?: string[];
  stocks?: ProductStock[];
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  mainImages: string[];
  sizes?: ProductSize[];
  colorVariants?: ProductColorVariant[];
  status: string;
  featured?: boolean;
}

export function useProducts(initialLimit = 10, categorySlugOrId?: string) {
  const fetchProductsPage = async ({ pageParam = null }: { pageParam: string | null }) => {
    const params: Record<string, unknown> = { limit: initialLimit, status: 'published' };
    if (categorySlugOrId) params.category = categorySlugOrId;
    if (pageParam) params.cursor = pageParam;

    const response = await apiClient.get('/products', {
      params,
      skipAuth: true,
    });
    return response.data;
  };

  const queryKey = useMemo(() => {
    return categorySlugOrId
      ? ['products', { limit: initialLimit, category: categorySlugOrId }]
      : ['products', { limit: initialLimit }];
  }, [initialLimit, categorySlugOrId]);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery({
      queryKey,
      queryFn: fetchProductsPage,
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
  const fetchSingleProduct = async () => {
    const response = await apiClient.get(`/products/${id}`, { skipAuth: true });
    const resData = response.data;
    if (resData.success && resData.data) {
      return resData.data as Product;
    } else {
      throw new Error(resData.error || 'Product not found');
    }
  };

  const {
    data: product,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['product', id],
    queryFn: fetchSingleProduct,
    enabled: !!id,
    staleTime: 1000 * 30, // 30 seconds
  });

  return { product: product || null, loading, error: error?.message || null };
}
