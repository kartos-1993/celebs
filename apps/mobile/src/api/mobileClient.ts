import axios from 'axios';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3333/api/v1';
  }
  
  // Extract host IP running Metro to allow physical device connections
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3333/api/v1`;
  }
  
  return Platform.OS === 'android' ? 'http://10.0.2.2:3333/api/v1' : 'http://localhost:3333/api/v1';
};

const API_URL = getBaseUrl();

export const mobileClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (__DEV__) {
  mobileClient.interceptors.request.use((config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params ? JSON.stringify(config.params) : '');
    return config;
  });
  mobileClient.interceptors.response.use(
    (response) => {
      console.log(`[API Response] ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      console.error(`[API Error] ${error.response?.status || 'Network Error'} ${error.config?.url}`, error.message);
      return Promise.reject(error);
    }
  );
}

// Types
export interface Product {
  id: string;
  name: string;
  price: number;
  discount: number;
  mainImage: string;
  badge?: string;
  availableColors: string[];
}

export interface HomeFeed {
  banners: { id: string; imageUrl: string; link: string }[];
  hotDeals: Product[];
  popularPicks: Product[];
  trends: Product[];
}

// Hooks
export const useHomeFeed = (category: string = 'men') => {
  return useQuery<HomeFeed>({
    queryKey: ['homeFeed', category],
    queryFn: async () => {
      const { data } = await mobileClient.get(`/mobile/home?category=${category}`);
      return data.data;
    },
  });
};

export const useInfiniteProducts = (category: string = 'men') => {
  return useInfiniteQuery({
    queryKey: ['infiniteProducts', category],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data } = await mobileClient.get('/mobile/products', {
        params: {
          category,
          cursor: pageParam,
          limit: 20,
        },
      });
      return data;
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor || null,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['mobileCategories'],
    queryFn: async () => {
      const { data } = await mobileClient.get('/mobile/categories');
      return data.data as { id: string; label: string }[];
    },
  });
};
