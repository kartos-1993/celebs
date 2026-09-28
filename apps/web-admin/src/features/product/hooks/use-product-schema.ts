/**
 * Fetches and normalizes the dynamic product form schema for a category.
 *
 * Pipeline: server `product-render` fields → category-attribute fallbacks
 * → group normalization → variant infrastructure injection (ColorMeta +
 * SkuTableV2) → baseline safety net (media/pricing) if still empty.
 *
 * Error contract: the pipeline NEVER falls back to `FALLBACK_FIELD_SCHEMA` on
 * failure. A fetch that cannot be completed rejects, the query surfaces
 * `error`, and callers render an explicit schema-error state. Submit is
 * blocked because `schemaFields` stays empty (see the gate in
 * `use-add-product-submit.ts`) — silently rendering fabricated baseline
 * fields would let a seller submit a product against a schema the server
 * never described.
 */
import { useQuery } from '@tanstack/react-query';

import { fetchProductRenderSchema, PRODUCT_QUERY_KEYS } from '../api';
import {
  addFallbackFields,
  ensureVariantSupportFields,
  normalizeSchema,
} from '../components/dynamic-form-utils';
import type { FieldSpec } from '../types';

/**
 * Legacy alias — schema keys now live in the single `PRODUCT_QUERY_KEYS`
 * factory in `../api`. Same object identity, so a category-feature caller
 * invalidating `PRODUCT_SCHEMA_QUERY_KEYS.all` still hits the render cache.
 */
export const PRODUCT_SCHEMA_QUERY_KEYS = {
  all: PRODUCT_QUERY_KEYS.schemaAll,
  render: PRODUCT_QUERY_KEYS.schemaRender,
};

/**
 * Guaranteed minimum selling fields when a category has no configured
 * attributes. name/brand/description are intentionally excluded —
 * BasicInfoSection renders them whenever the schema doesn't declare them.
 * SUCCESS-path only: never used to paper over a failed fetch.
 *
 * The cover field is declared under the PLURAL `mainImages`, which is both the
 * name the server's field spec publishes and the name the write contract
 * accepts (`mainImages` in `@celebs/shared-types`). The pre-unification
 * singular spelled the same value under a DIFFERENT key, so a form served
 * through this path registered its gallery as `mainImage` while
 * `resolveCoverFieldName` and the payload read `mainImages` — one gallery, two
 * spellings, bridged by a read alias nobody should need. This file also owns
 * the dynamic form's own use of the name in `resetForNewCategory`.
 */
const FALLBACK_FIELD_SCHEMA: FieldSpec[] = [
  {
    name: 'mainImages',
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
    queryKey: PRODUCT_QUERY_KEYS.schemaRender(catId, productId),
    queryFn: async (): Promise<FieldSpec[]> => {
      const res = await fetchProductRenderSchema(catId, productId);
      const serverFields: FieldSpec[] = res.data?.fields ?? [];
      const withFallbacks = await addFallbackFields(catId, serverFields);
      const merged = ensureVariantSupportFields(normalizeSchema(withFallbacks));
      return merged.length > 0 ? merged : [...FALLBACK_FIELD_SCHEMA];
    },
    enabled: Boolean(catId),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}
