/**
 * Fetches and normalizes the dynamic product form schema for a category.
 *
 * Pipeline: server `product-render` fields → category-attribute fallbacks
 * → group normalization → variant infrastructure injection (ColorMeta +
 * SkuTableV2) → baseline safety net (media/pricing) if still empty.
 */
import { useQuery } from '@tanstack/react-query';
import { logger } from '@celebs/shared-utils';
import { axiosClient } from '@/lib/axios/axios-client';
import type { FieldSpec } from '../types';
import {
  addFallbackFields,
  ensureVariantSupportFields,
  normalizeSchema,
} from '../components/dynamic-form-utils';

export const PRODUCT_SCHEMA_QUERY_KEYS = {
  all: ['product-schema'] as const,
  render: (catId: string, productId?: string) =>
    [...PRODUCT_SCHEMA_QUERY_KEYS.all, 'render', catId, productId ?? 'new'] as const,
};

/**
 * Guaranteed minimum selling fields when a category has no configured
 * attributes. name/brand/description are intentionally excluded —
 * BasicInfoSection renders them whenever the schema doesn't declare them.
 */
const BASELINE_SCHEMA: FieldSpec[] = [
  {
    name: 'mainImage',
    uiType: 'MainImage',
    label: 'Main Product Image',
    group: 'media',
    required: true,
    rule: { maxItems: 5, accept: ['image/jpeg', 'image/png', 'image/webp'] },
    visible: true,
  },
  {
    name: 'price',
    uiType: 'number',
    label: 'Base Price',
    group: 'sale',
    required: true,
    rule: { min: 0 },
    visible: true,
  },
  {
    name: 'specialPrice',
    uiType: 'number',
    label: 'Special / Sale Price',
    group: 'sale',
    required: false,
    rule: { min: 0 },
    visible: true,
  },
];

export function useProductSchema(catId: string, productId?: string) {
  return useQuery({
    queryKey: PRODUCT_SCHEMA_QUERY_KEYS.render(catId, productId),
    queryFn: async (): Promise<FieldSpec[]> => {
      try {
        const response = await axiosClient.get('/product-render', {
          params: { catId, locale: 'en_US', productId },
        });
        const serverFields: FieldSpec[] = response.data?.data?.data ?? response.data?.data ?? [];
        const withFallbacks = await addFallbackFields(catId, serverFields);
        const merged = ensureVariantSupportFields(normalizeSchema(withFallbacks));
        return merged.length > 0 ? merged : [...BASELINE_SCHEMA];
      } catch (error) {
        logger.warn({ error, catId }, 'Failed to load category schema; falling back to baseline schema');
        return [...BASELINE_SCHEMA];
      }
    },
    enabled: Boolean(catId),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}
