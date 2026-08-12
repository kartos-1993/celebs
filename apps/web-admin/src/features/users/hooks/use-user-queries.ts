export const USERS_QUERY_KEYS = {
  all: ['users'] as const,
  list: () => [...USERS_QUERY_KEYS.all, 'list'] as const,
};
