export const PATHS = {
  AUTH: {
    LOGIN: '/login',
    SETUP_SUPERADMIN: '/setup-superadmin',
    REGISTER: '/register',
    VENDOR_REGISTER: '/register/vendor',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
  },
  DASHBOARD: '/',
  PRODUCTS: {
    LIST: '/products',
    CREATE: '/products/new',
    EDIT: (id: string) => `/products/${id}`,
  },
  CATEGORIES: {
    LIST: '/categories',
  },
  VENDORS: {
    LIST: '/vendors',
    DETAIL: (id: string) => `/vendors/${id}`,
    ONBOARDING: '/onboarding',
  },
  ORDERS: {
    LIST: '/orders',
    DETAIL: (id: string) => `/orders/${id}`,
  },
  USERS: {
    LIST: '/users',
  },
  STAFF: {
    LIST: '/staff',
  },
  FINANCE: {
    PAYOUTS: '/finance/payouts',
    COMMISSIONS: '/finance/commissions',
    REPORTS: '/finance/reports',
  },
  MARKETING: {
    COMBOS: '/marketing/combos',
    CAMPAIGNS: '/marketing/campaigns',
    PREVIEW: '/marketing/preview',
  },

  ACCOUNT: {
    PROFILE: '/account/profile',
    SECURITY: '/account/security',
  },
  PLATFORM_SETTINGS: {
    SYSTEM: '/settings/system',
    TENANT: '/settings/tenant',
  },
  ERRORS: {
    NOT_FOUND: '/404',
    FORBIDDEN: '/403',
    SERVER_ERROR: '/500',
  },
} as const;
