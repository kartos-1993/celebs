export const STAFF_QUERY_KEYS = {
  all: ['staff'] as const,
  list: (vendorId?: string) => [...STAFF_QUERY_KEYS.all, 'list', { vendorId }] as const,
};
