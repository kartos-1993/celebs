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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchProducts = useCallback(async (cursor?: string | null, isRefresh = false) => {
    try {
      if (!cursor && !isRefresh) {
        setLoading(true);
      } else if (cursor) {
        setLoadingMore(true);
      }

      const cursorParam = cursor ? `&cursor=${cursor}` : '';
      const url = `${getApiUrl()}/products?limit=${initialLimit}${cursorParam}`;
      const response = await fetch(url);
      const resData = await response.json();

      if (resData.success && resData.data) {
        const rawProducts: Product[] = Array.isArray(resData.data.products)
          ? resData.data.products
          : Array.isArray(resData.data)
          ? resData.data
          : [];

        const serverCursor = resData.data.nextCursor || (rawProducts.length > 0 ? rawProducts[rawProducts.length - 1]._id : null);
        const serverHasMore = typeof resData.data.hasMore === 'boolean' ? resData.data.hasMore : rawProducts.length >= initialLimit;

        if (!cursor || isRefresh) {
          setProducts(rawProducts);
        } else {
          setProducts((prev) => {
            const existingIds = new Set(prev.map((p) => p._id));
            const newUnique = rawProducts.filter((p) => !existingIds.has(p._id));
            return [...prev, ...newUnique];
          });
        }

        setNextCursor(serverCursor);
        setHasMore(serverHasMore);
      } else {
        setProducts([]);
        setHasMore(false);
      }
    } catch (error) {
      console.warn('Error fetching API products:', error);
      setProducts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [initialLimit]);

  useEffect(() => {
    fetchProducts(null);
  }, [fetchProducts]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      fetchProducts(nextCursor);
    }
  }, [fetchProducts, loading, loadingMore, hasMore, nextCursor]);

  const refetch = useCallback(() => {
    setNextCursor(null);
    return fetchProducts(null, true);
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
