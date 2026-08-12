export const ORDERS_QUERY_KEYS = {
  all: ['orders'] as const,
  list: (filters?: Record<string, unknown>) => [...ORDERS_QUERY_KEYS.all, 'list', filters] as const,
};
