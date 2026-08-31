import { Page,test as base } from '@playwright/test';

export type AuthRole = 'SUPERADMIN' | 'ADMIN' | 'VENDOR' | 'STAFF' | 'CUSTOMER';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  vendorId?: string;
  vendorProfile?: {
    id: string;
    shopName: string;
    status: string;
  };
  permissions: string[];
}

export const ROLE_PROFILES: Record<AuthRole, MockUser> = {
  SUPERADMIN: {
    id: 'usr_superadmin_01',
    name: 'Super Admin User',
    email: 'superadmin@celebs.com',
    role: 'SUPERADMIN',
    permissions: [
      'product:view',
      'product:create',
      'product:edit',
      'product:delete',
      'product:publish',
      'product:review',
      'catalog:view',
      'catalog:manage',
      'order:view',
      'order:manage',
      'finance:view',
      'finance:manage',
      'vendor:view',
      'vendor:manage',
      'staff:view',
      'staff:manage',
      'user:view',
      'user:manage',
      'platform:manage',
    ],
  },
  ADMIN: {
    id: 'usr_admin_01',
    name: 'Admin Moderator',
    email: 'admin@celebs.com',
    role: 'ADMIN',
    permissions: [
      'product:view',
      'product:create',
      'product:edit',
      'product:delete',
      'product:publish',
      'product:review',
      'catalog:view',
      'order:view',
      'order:manage',
      'finance:view',
      'finance:manage',
      'vendor:view',
      'vendor:manage',
    ],
  },
  VENDOR: {
    id: 'usr_vendor_01',
    name: 'Trendy Wear Nepal',
    email: 'vendor@trendywear.com',
    role: 'VENDOR',
    vendorId: 'vp_trendy_wear',
    vendorProfile: {
      id: 'vp_trendy_wear',
      shopName: 'Trendy Wear Nepal',
      status: 'APPROVED',
    },
    permissions: [
      'product:view',
      'product:create',
      'product:edit',
      'product:delete',
      'catalog:view',
      'order:view',
      'order:manage',
      'finance:view',
      'staff:view',
      'staff:manage',
    ],
  },
  STAFF: {
    id: 'usr_staff_01',
    name: 'Ramesh Staff',
    email: 'ramesh.staff@trendywear.com',
    role: 'STAFF',
    vendorId: 'vp_trendy_wear',
    vendorProfile: {
      id: 'vp_trendy_wear',
      shopName: 'Trendy Wear Nepal',
      status: 'APPROVED',
    },
    permissions: ['product:view', 'product:create', 'product:edit'],
  },
  CUSTOMER: {
    id: 'usr_customer_01',
    name: 'Regular Customer',
    email: 'customer@gmail.com',
    role: 'CUSTOMER',
    permissions: [],
  },
};

/**
 * Authenticate page as a specific role by intercepting session endpoints.
 */
export async function authenticateAs(page: Page, role: AuthRole = 'VENDOR') {
  const user = ROLE_PROFILES[role];

  await page.route('**/api/**/session**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Session active',
        data: {
          user,
        },
      }),
    });
  });

  await page.route('**/api/**/auth/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Auth mock',
        data: user,
      }),
    });
  });
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await authenticateAs(page, 'VENDOR');
    await use(page);
  },
});

export { expect } from '@playwright/test';
