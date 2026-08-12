export const AUTH_QUERY_KEYS = {
  all: ['auth'] as const,
  setupStatus: () => [...AUTH_QUERY_KEYS.all, 'setup-status'] as const,
  mfaSetup: () => [...AUTH_QUERY_KEYS.all, 'mfa-setup'] as const,
};
