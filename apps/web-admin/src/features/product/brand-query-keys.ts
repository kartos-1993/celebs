import type { BrandFilterType } from '@celebs/shared-types';

export const BRAND_QUERY_KEYS = {
  all: ['brands'] as const,
  list: (filters?: Partial<BrandFilterType>) => ['brands', 'list', filters] as const,
  detail: (id: string) => ['brands', 'detail', id] as const,
  myAuthorizations: () => ['brands', 'authorizations', 'my'] as const,
};
