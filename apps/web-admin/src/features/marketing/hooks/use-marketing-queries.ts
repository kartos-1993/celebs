export const MARKETING_QUERY_KEYS = {
  all: ['marketing'] as const,
  campaigns: () => [...MARKETING_QUERY_KEYS.all, 'campaigns'] as const,
  campaignDetail: (id?: string) => [...MARKETING_QUERY_KEYS.all, 'campaigns', id] as const,
  combos: () => [...MARKETING_QUERY_KEYS.all, 'combos'] as const,
  comboDetail: (id?: string) => [...MARKETING_QUERY_KEYS.all, 'combos', id] as const,
};
