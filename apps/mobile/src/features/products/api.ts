import type { IApiResponse } from '@celebs/shared-types';

import type { Product, ProductFilterParams } from './types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

export const PRODUCT_QUERY_KEYS = {
  all: ['products'] as const,
  lists: () => [...PRODUCT_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...PRODUCT_QUERY_KEYS.lists(), filters ?? {}] as const,
  details: () => [...PRODUCT_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PRODUCT_QUERY_KEYS.details(), id] as const,
};

export interface PaginatedProductsPayload {
  products: Product[];
  total: number;
  nextCursor?: string;
  hasMore?: boolean;
}

export async function getProducts(params: ProductFilterParams): Promise<PaginatedProductsPayload> {
  return handleApiResponse(
    apiClient.get<IApiResponse<PaginatedProductsPayload>>('/products', {
      params: {
        status: 'published',
        ...params,
      },
      skipAuth: true,
    }),
  );
}

export async function getProductById(id: string): Promise<Product> {
  return handleApiResponse(
    apiClient.get<IApiResponse<Product>>(`/products/${id}`, { skipAuth: true }),
  );
}
