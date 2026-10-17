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
  /** Absent in cursor mode — see product-query.service.ts. */
  total?: number;
  nextCursor?: string;
  hasMore?: boolean;
}

/**
 * Explicit page-shape validation at the API boundary (mobile AGENTS.md §5/§7).
 * A page whose `products` is not an array is a broken backend contract: fail
 * loudly instead of coercing it to [] and rendering an empty grid.
 */
export function assertPaginatedProducts(payload: unknown): PaginatedProductsPayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !Array.isArray((payload as { products?: unknown }).products)
  ) {
    throw new Error(
      'Malformed /products page: expected { products: Product[], nextCursor?, hasMore?, total? }. ' +
        'Fix the backend controller at the source instead of coercing client-side.',
    );
  }
  return payload as PaginatedProductsPayload;
}

export async function getProducts(params: ProductFilterParams): Promise<PaginatedProductsPayload> {
  const payload = await handleApiResponse(
    apiClient.get<IApiResponse<unknown>>('/products', {
      params: {
        status: 'published',
        ...params,
      },
      skipAuth: true,
    }),
  );
  return assertPaginatedProducts(payload);
}

export async function getProductById(id: string): Promise<Product> {
  return handleApiResponse(
    apiClient.get<IApiResponse<Product>>(`/products/${id}`, { skipAuth: true }),
  );
}
