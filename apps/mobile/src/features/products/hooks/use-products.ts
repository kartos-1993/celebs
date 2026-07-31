import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { apiClient } from '@/api/client';

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
  _id: string;
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

// Helper to resolve local IP for media hosted on the developer machine
export const resolveImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('https://') || url.startsWith('http://img.')) {
    return url;
  }
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
  return url.replace(/localhost|127\.0\.0\.1|192\.168\.\d+\.\d+/g, localhost);
};

export function useProducts(initialLimit = 10, categorySlugOrId?: string) {
  const fetchProductsPage = async ({ pageParam = null }: { pageParam: string | null }) => {
    const params: Record<string, any> = { limit: initialLimit };
    if (categorySlugOrId) params.category = categorySlugOrId;
    if (pageParam) params.cursor = pageParam;

    const response = await apiClient.get('/products', {
      params,
      skipAuth: true,
    });
    return response.data;
  };

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['products', { limit: initialLimit, category: categorySlugOrId }],
    queryFn: fetchProductsPage,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (lastPage?.success && lastPage?.data) {
        const rawProducts = Array.isArray(lastPage.data.products)
          ? lastPage.data.products
          : Array.isArray(lastPage.data) ? lastPage.data : [];
        
        const serverCursor = lastPage.data.nextCursor || null;
        const serverHasMore = typeof lastPage.data.hasMore === 'boolean'
          ? lastPage.data.hasMore
          : (rawProducts.length >= initialLimit && Boolean(serverCursor));
        
        return serverHasMore ? serverCursor : null;
      }
      return null;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const products = useMemo(() => {
    if (!data) return [];
    const allProducts = data.pages.flatMap((page) => {
      if (page?.success && page?.data) {
        return Array.isArray(page.data.products)
          ? page.data.products
          : Array.isArray(page.data) ? page.data : [];
      }
      return [];
    });
    const seen = new Set<string>();
    return allProducts.filter((product) => {
      if (!product?._id || seen.has(product._id)) return false;
      seen.add(product._id);
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

  const { data: product, isLoading: loading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: fetchSingleProduct,
    enabled: !!id,
    staleTime: 1000 * 30, // 30 seconds
  });

  return { product: product || null, loading, error: error?.message || null };
}
