import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  if (url.startsWith('https://') || url.startsWith('http://img.')) {
    return url;
  }
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
  return url.replace(/localhost|127\.0\.0\.1|192\.168\.\d+\.\d+/g, localhost);
};

export function useProducts(initialLimit = 10, categorySlugOrId?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const fetchedCursorsRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);

  const fetchProducts = useCallback(async (cursor?: string | null, isRefresh = false) => {
    if (isFetchingRef.current) {
      console.log('⏸️ [useProducts] Request already in-flight - ignoring duplicate call.');
      return;
    }
    if (cursor && fetchedCursorsRef.current.has(cursor)) {
      console.log('⏹️ [useProducts] Cursor already fetched - ignoring duplicate call:', cursor);
      return;
    }

    isFetchingRef.current = true;
    if (cursor) {
      fetchedCursorsRef.current.add(cursor);
    } else {
      fetchedCursorsRef.current.clear();
    }

    try {
      if (!cursor && !isRefresh) {
        setLoading(true);
      } else if (cursor) {
        setLoadingMore(true);
      }

      const cursorParam = cursor ? `&cursor=${cursor}` : '';
      const categoryParam = categorySlugOrId ? `&category=${encodeURIComponent(categorySlugOrId)}` : '';
      const url = `${getApiUrl()}/products?limit=${initialLimit}${categoryParam}${cursorParam}`;
      console.log('Fetching products from:', url);
      const response = await fetch(url);
      const resData = await response.json();
      console.log('Products API resData success:', resData.success, 'count:', resData.data?.products?.length);

      if (resData.success && resData.data) {
        const rawProducts: Product[] = Array.isArray(resData.data.products)
          ? resData.data.products
          : Array.isArray(resData.data)
          ? resData.data
          : [];

        const serverCursor = resData.data.nextCursor || null;
        const serverHasMore = typeof resData.data.hasMore === 'boolean'
          ? resData.data.hasMore
          : (rawProducts.length >= initialLimit && Boolean(serverCursor));

        if (!cursor || isRefresh) {
          setProducts(rawProducts);
        } else {
          if (rawProducts.length > 0) {
            setProducts((prev) => {
              const existingIds = new Set(prev.map((p) => p._id));
              const newUnique = rawProducts.filter((p) => !existingIds.has(p._id));
              return [...prev, ...newUnique];
            });
          }
        }

        setNextCursor(serverCursor);
        setHasMore(rawProducts.length > 0 ? serverHasMore : false);
      } else {
        setProducts((prev) => (prev.length > 0 ? prev : []));
        setHasMore(false);
        setNextCursor(null);
      }
    } catch (error) {
      console.warn('Error fetching API products, stopping pagination:', error);
      setProducts((prev) => (prev.length > 0 ? prev : []));
      setHasMore(false);
      setNextCursor(null);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [initialLimit, categorySlugOrId]);

  useEffect(() => {
    fetchProducts(null);
  }, [fetchProducts]);

  const loadMore = useCallback(() => {
    if (!hasMore || !nextCursor) {
      console.log('⏹️ [useProducts] Reached end of catalog - NO API call made. (hasMore:', hasMore, ', nextCursor:', nextCursor, ')');
      return;
    }
    if (!loading && !loadingMore) {
      fetchProducts(nextCursor);
    }
  }, [fetchProducts, loading, loadingMore, hasMore, nextCursor]);

  const refetch = useCallback(() => {
    setNextCursor(null);
    fetchedCursorsRef.current.clear();
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
