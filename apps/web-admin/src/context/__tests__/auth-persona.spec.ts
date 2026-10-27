import { describe, expect, it } from 'vitest';

import { Permission } from '@celebs/rbac';
import type { UserData, VendorProfileData } from '@celebs/shared-types';

import { deriveAuthPersona } from '../auth-persona';

function createMockVendorProfile(overrides: Partial<VendorProfileData>): VendorProfileData {
  return {
    id: 'store-1',
    shopName: 'Shop',
    status: 'APPROVED',
    onboardingStep: 4,
    holidayMode: false,
    phoneNumber: '9800000000',
    ...overrides,
  };
}

function createMockUser(overrides: Partial<UserData>): UserData {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'CUSTOMER',
    isEmailVerified: true,
    permissions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('deriveAuthPersona', () => {
  it('evaluates platform superadmin with mode admin and all permissions unlocked', () => {
    const user = createMockUser({
      id: 'super-1',
      email: 'super@celebs.com',
      role: 'SUPERADMIN',
    });

    const persona = deriveAuthPersona(user);

    expect(persona.isPlatform).toBe(true);
    expect(persona.isSeller).toBe(false);
    expect(persona.mode).toBe('admin');
    expect(persona.isSuperAdmin).toBe(true);
    expect(persona.isAdmin).toBe(false);
    expect(persona.permissions.length).toBe(Object.values(Permission).length);
    expect(persona.permissions).toContain(Permission.COMMISSION_MANAGE);
    expect(persona.permissions).toContain(Permission.PLATFORM_MANAGE);
  });

  it('evaluates platform admin with mode admin and platform flag set', () => {
    const user = createMockUser({
      id: 'admin-1',
      email: 'admin@celebs.com',
      role: 'ADMIN',
    });

    const persona = deriveAuthPersona(user);

    expect(persona.isPlatform).toBe(true);
    expect(persona.isSeller).toBe(false);
    expect(persona.mode).toBe('admin');
    expect(persona.isAdmin).toBe(true);
    expect(persona.isSuperAdmin).toBe(false);
    expect(persona.permissions).toContain(Permission.PRODUCT_REVIEW);
    expect(persona.permissions).toContain(Permission.FINANCE_PLATFORM_VIEW);
    expect(persona.permissions).not.toContain(Permission.COMMISSION_MANAGE);
  });

  it('guarantees platform admin is never classified as seller even if vendorId is present', () => {
    const user = createMockUser({
      id: 'admin-2',
      email: 'admin@celebs.com',
      role: 'ADMIN',
      vendorId: 'accidental-vendor-id',
    });

    const persona = deriveAuthPersona(user);

    expect(persona.isPlatform).toBe(true);
    expect(persona.isSeller).toBe(false);
    expect(persona.mode).toBe('admin');
  });

  it('evaluates store vendor with mode vendor and store id preserved', () => {
    const user = createMockUser({
      id: 'vendor-user-1',
      email: 'cachee@celebs.com',
      role: 'VENDOR',
      vendorProfile: createMockVendorProfile({
        id: 'store-cachee-123',
        shopName: 'Cachee Official',
      }),
    });

    const persona = deriveAuthPersona(user);

    expect(persona.isPlatform).toBe(false);
    expect(persona.isSeller).toBe(true);
    expect(persona.mode).toBe('vendor');
    expect(persona.storeId).toBe('store-cachee-123');
    expect(persona.isVendor).toBe(true);
    expect(persona.isStaff).toBe(false);
    expect(persona.permissions).toContain(Permission.PRODUCT_CREATE);
    expect(persona.permissions).toContain(Permission.ORDER_MANAGE);
    expect(persona.permissions).toContain(Permission.FINANCE_VIEW);
    expect(persona.permissions).not.toContain(Permission.FINANCE_PLATFORM_VIEW);
  });

  it('evaluates store inventory staff with product permissions and no finance access', () => {
    const user = createMockUser({
      id: 'staff-inv-1',
      email: 'inventory@cachee.com',
      role: 'STAFF',
      vendorProfile: createMockVendorProfile({
        id: 'store-cachee-123',
        shopName: 'Cachee Official',
      }),
      permissions: [
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_EDIT,
        Permission.MEDIA_VIEW,
      ],
    });

    const persona = deriveAuthPersona(user);

    expect(persona.isPlatform).toBe(false);
    expect(persona.isSeller).toBe(true);
    expect(persona.mode).toBe('vendor');
    expect(persona.storeId).toBe('store-cachee-123');
    expect(persona.isStaff).toBe(true);
    expect(persona.permissions).toContain(Permission.PRODUCT_CREATE);
    expect(persona.permissions).not.toContain(Permission.FINANCE_VIEW);
    expect(persona.permissions).not.toContain(Permission.ORDER_MANAGE);
  });

  it('evaluates store accountant staff with finance permissions and no product editing', () => {
    const user = createMockUser({
      id: 'staff-acc-1',
      email: 'finance@cachee.com',
      role: 'STAFF',
      vendorProfile: createMockVendorProfile({
        id: 'store-cachee-123',
        shopName: 'Cachee Official',
      }),
      permissions: [Permission.FINANCE_VIEW, Permission.ORDER_VIEW],
    });

    const persona = deriveAuthPersona(user);

    expect(persona.isPlatform).toBe(false);
    expect(persona.isSeller).toBe(true);
    expect(persona.mode).toBe('vendor');
    expect(persona.storeId).toBe('store-cachee-123');
    expect(persona.permissions).toContain(Permission.FINANCE_VIEW);
    expect(persona.permissions).not.toContain(Permission.PRODUCT_CREATE);
    expect(persona.permissions).not.toContain(Permission.PRODUCT_EDIT);
  });

  it('defaults unauthenticated guest to customer with no permissions and mode vendor', () => {
    const persona = deriveAuthPersona(undefined);

    expect(persona.isPlatform).toBe(false);
    expect(persona.isSeller).toBe(false);
    expect(persona.mode).toBe('vendor');
    expect(persona.isVendor).toBe(false);
    expect(persona.isAdmin).toBe(false);
    expect(persona.isSuperAdmin).toBe(false);
    expect(persona.isStaff).toBe(false);
    expect(persona.permissions).toEqual([]);
  });
});
