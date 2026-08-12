export const VENDORS_QUERY_KEYS = {
  all: ['vendors'] as const,
  list: () => [...VENDORS_QUERY_KEYS.all, 'list'] as const,
  detail: (id: string) => [...VENDORS_QUERY_KEYS.all, 'detail', id] as const,
};
