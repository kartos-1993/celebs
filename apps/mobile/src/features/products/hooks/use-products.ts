import { useState, useEffect, useCallback } from 'react';
import Constants from 'expo-constants';

export interface Product {
  _id: string;
  name: string;
  brand?: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  mainImages: string[];
  colorVariants?: Array<{
    name: string;
    colorCode: string;
    images?: string[];
  }>;
  status: string;
  featured?: boolean;
}

// API URL helper to dynamically target local server IP in Expo
const getApiUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
  return `http://${localhost}:3333/api/v1`;
};

// Helper to resolve local IP for media hosted on the developer machine
export const resolveImageUrl = (url: string) => {
  if (!url) return '';
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
  return url.replace(/localhost|127\.0\.0\.1/g, localhost);
};

export function useProducts(initialLimit = 10) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchProducts = useCallback(async (targetPage = 1, isRefresh = false) => {
    try {
      if (targetPage === 1 && !isRefresh) {
        setLoading(true);
      } else if (targetPage > 1) {
        setLoadingMore(true);
      }

      const url = `${getApiUrl()}/products?page=${targetPage}&limit=${initialLimit}`;
      const response = await fetch(url);
      const resData = await response.json();

      if (resData.success && resData.data) {
        const rawProducts: Product[] = Array.isArray(resData.data.products)
          ? resData.data.products
          : Array.isArray(resData.data)
          ? resData.data
          : [];

        const total = resData.data.total || rawProducts.length;

        if (targetPage === 1 || isRefresh) {
          setProducts(rawProducts);
        } else {
          setProducts((prev) => {
            // Filter duplicates by _id
            const existingIds = new Set(prev.map((p) => p._id));
            const newUnique = rawProducts.filter((p) => !existingIds.has(p._id));
            return [...prev, ...newUnique];
          });
        }

        setHasMore(targetPage * initialLimit < total);
        setPage(targetPage);
      }
    } catch (error) {
      console.warn('Error fetching products:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [initialLimit]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      fetchProducts(page + 1);
    }
  }, [fetchProducts, loading, loadingMore, hasMore, page]);

  const refetch = useCallback(() => {
    return fetchProducts(1, true);
  }, [fetchProducts]);

  return {
    products,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refetch,
  };
}
