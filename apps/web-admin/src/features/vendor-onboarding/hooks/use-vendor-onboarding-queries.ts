export const VENDOR_ONBOARDING_QUERY_KEYS = {
  all: ['vendor-onboarding'] as const,
  status: () => [...VENDOR_ONBOARDING_QUERY_KEYS.all, 'status'] as const,
};
