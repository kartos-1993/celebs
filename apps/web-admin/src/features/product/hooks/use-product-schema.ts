import { useQuery } from '@tanstack/react-query';
import { ProductAPI } from '@/lib/axios-client';
import type { FieldSpec } from '../fields/ui-registry';
import {
  addFallbackFields,
  normalizeSchema,
  ensureVariantSupportFields,
} from '../components/dynamic-product-form';

export const PRODUCT_SCHEMA_QUERY_KEYS = {
  all: ['product-schema'] as const,
  render: (catId: string, productId?: string) =>
    [...PRODUCT_SCHEMA_QUERY_KEYS.all, 'render', catId, productId || 'new'] as const,
};

export function useProductSchema(catId: string, productId?: string) {
  return useQuery({
    queryKey: PRODUCT_SCHEMA_QUERY_KEYS.render(catId, productId),
    queryFn: async (): Promise<FieldSpec[]> => {
      if (!catId) return [];

      const response = await ProductAPI.get('/product-render', {
        params: { catId, locale: 'en_US', productId },
      });

      const serverFields: FieldSpec[] =
        response.data?.data?.data ?? response.data?.data ?? [];

      let merged = await addFallbackFields(catId, serverFields);
      merged = normalizeSchema(merged);
      merged = ensureVariantSupportFields(merged);

      return merged;
    },
    enabled: !!catId,
    staleTime: 2 * 60 * 1000,
  });
}
