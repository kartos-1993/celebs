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

export function useProducts(initialLimit = 10) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const fetchedCursorsRef = useRef<Set<string>>(new Set());

  const fetchProducts = useCallback(async (cursor?: string | null, isRefresh = false) => {
    if (cursor && fetchedCursorsRef.current.has(cursor)) {
      return;
    }
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
      const url = `${getApiUrl()}/products?limit=${initialLimit}${cursorParam}`;
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
          setProducts(rawProducts.length > 0 ? rawProducts : MOCK_SHEIN_PRODUCTS);
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
        setProducts((prev) => (prev.length > 0 ? prev : MOCK_SHEIN_PRODUCTS));
        setHasMore(false);
        setNextCursor(null);
      }
    } catch (error) {
      console.warn('Error fetching API products, stopping pagination:', error);
      setProducts((prev) => (prev.length > 0 ? prev : MOCK_SHEIN_PRODUCTS));
      setHasMore(false);
      setNextCursor(null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [initialLimit]);

  useEffect(() => {
    fetchProducts(null);
  }, [fetchProducts]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore && nextCursor) {
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

export const MOCK_SHEIN_PRODUCTS: Product[] = [
  {
    _id: 'shein-1',
    name: 'Men Quarter Zip Contrast Collar Striped Knit Polo Shirt',
    price: 21.99,
    discountedPrice: 14.49,
    status: 'published',
    featured: true,
    mainImages: ['https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?q=80&w=800'],
    colorVariants: [
      { name: 'Black/White', colorCode: '#1c1c1e' },
      { name: 'Beige', colorCode: '#d4c5b9' },
      { name: 'Navy', colorCode: '#1d2d44' },
    ],
  },
  {
    _id: 'shein-2',
    name: 'Men Vintage Casual Linen Short Sleeve Button Down Shirt',
    price: 18.99,
    discountedPrice: 12.99,
    status: 'published',
    featured: true,
    mainImages: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800'],
    colorVariants: [
      { name: 'Olive', colorCode: '#556b2f' },
      { name: 'Black', colorCode: '#000000' },
      { name: 'White', colorCode: '#ffffff' },
    ],
  },
  {
    _id: 'shein-3',
    name: 'Men 3PCS Multi-Color Thermal Seamless Balaclava Face Mask',
    price: 11.99,
    discountedPrice: 7.49,
    status: 'published',
    featured: false,
    mainImages: ['https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800'],
    colorVariants: [
      { name: 'Multi', colorCode: '#3a5a40' },
    ],
  },
  {
    _id: 'shein-4',
    name: 'Men Contrast Block Short Sleeve Cuban Collar Summer Shirt',
    price: 24.99,
    discountedPrice: 16.99,
    status: 'published',
    featured: true,
    mainImages: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800'],
    colorVariants: [
      { name: 'Teal/White', colorCode: '#2a9d8f' },
      { name: 'Black/Grey', colorCode: '#264653' },
    ],
  },
  {
    _id: 'shein-5',
    name: 'Men 6-Pack Seamless Moisture Wicking Boxer Briefs',
    price: 19.99,
    discountedPrice: 11.99,
    status: 'published',
    featured: false,
    mainImages: ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800'],
    colorVariants: [
      { name: 'Assorted', colorCode: '#4a4e69' },
    ],
  },
  {
    _id: 'shein-6',
    name: 'Men Two-Tone Zip Top & Elastic Waistband Shorts Tracksuit Set',
    price: 32.99,
    discountedPrice: 22.49,
    status: 'published',
    featured: true,
    mainImages: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800'],
    colorVariants: [
      { name: 'Grey', colorCode: '#8d99ae' },
      { name: 'Navy', colorCode: '#2b2d42' },
    ],
  },
  {
    _id: 'shein-7',
    name: 'Men Vertical Striped Slim Fit Summer Short Sleeve Polo',
    price: 22.99,
    discountedPrice: 15.99,
    status: 'published',
    featured: true,
    mainImages: ['https://images.unsplash.com/photo-1626497764746-6dc36546b388?q=80&w=800'],
    colorVariants: [
      { name: 'Striped Black', colorCode: '#000000' },
      { name: 'Striped Navy', colorCode: '#1d3557' },
    ],
  },
  {
    _id: 'shein-8',
    name: 'Men Mandarin Collar Slim Fit Single Breasted Formal Suit Jacket',
    price: 49.99,
    discountedPrice: 34.99,
    status: 'published',
    featured: true,
    mainImages: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800'],
    colorVariants: [
      { name: 'White', colorCode: '#f8f9fa' },
      { name: 'Black', colorCode: '#212529' },
    ],
  },
];
