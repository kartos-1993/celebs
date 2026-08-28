import type { Product, ProductFilterParams } from './types';

import { apiClient } from '@/api/client';

export const PRODUCT_QUERY_KEYS = {
  all: ['products'] as const,
  lists: () => [...PRODUCT_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...PRODUCT_QUERY_KEYS.lists(), filters ?? {}] as const,
  details: () => [...PRODUCT_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PRODUCT_QUERY_KEYS.details(), id] as const,
};

export async function getProducts(params: ProductFilterParams) {
  const response = await apiClient.get('/products', {
    params: {
      status: 'published',
      ...params,
    },
    skipAuth: true,
  });
  return response.data;
}

export async function getProductById(id: string): Promise<Product> {
  const response = await apiClient.get(`/products/${id}`, { skipAuth: true });
  const resData = response.data;
  if (resData.success && resData.data) {
    return resData.data as Product;
  }
  throw new Error(resData.error || 'Product not found');
}
