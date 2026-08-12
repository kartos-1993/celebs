export const ACCOUNT_QUERY_KEYS = {
  all: ['account'] as const,
  userSession: () => [...ACCOUNT_QUERY_KEYS.all, 'user-session'] as const,
  sessions: () => [...ACCOUNT_QUERY_KEYS.all, 'sessions'] as const,
};
