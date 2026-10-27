import { describe, expect, it } from 'vitest';

import { Permission } from '@celebs/rbac';

import { deriveAuthPersona } from '../auth-persona';

import type { UserData } from '@/types';

describe('deriveAuthPersona', () => {
  it('evaluates platform superadmin with mode admin and all permissions unlocked', () => {
    const user: UserData = {
      id: 'super-1',
      email: 'super@celebs.com',
      role: 'SUPERADMIN',
      isEmailVerified: true,
      permissions: [],
    };

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
    const user: UserData = {
      id: 'admin-1',
      email: 'admin@celebs.com',
      role: 'ADMIN',
      isEmailVerified: true,
      permissions: [],
    };

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
    const user: UserData = {
      id: 'admin-2',
      email: 'admin@celebs.com',
      role: 'ADMIN',
      isEmailVerified: true,
      vendorId: 'accidental-vendor-id',
      permissions: [],
    };

    const persona = deriveAuthPersona(user);

    expect(persona.isPlatform).toBe(true);
    expect(persona.isSeller).toBe(false);
    expect(persona.mode).toBe('admin');
  });

  it('evaluates store vendor with mode vendor and store id preserved', () => {
    const user: UserData = {
      id: 'vendor-user-1',
      email: 'cachee@celebs.com',
      role: 'VENDOR',
      isEmailVerified: true,
      vendorProfile: {
        id: 'store-cachee-123',
        shopName: 'Cachee Official',
      },
      permissions: [],
    };

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
    const user: UserData = {
      id: 'staff-inv-1',
      email: 'inventory@cachee.com',
      role: 'STAFF',
      isEmailVerified: true,
      vendorProfile: {
        id: 'store-cachee-123',
        shopName: 'Cachee Official',
      },
      permissions: [
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_EDIT,
        Permission.MEDIA_VIEW,
      ],
    };

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
    const user: UserData = {
      id: 'staff-acc-1',
      email: 'finance@cachee.com',
      role: 'STAFF',
      isEmailVerified: true,
      vendorProfile: {
        id: 'store-cachee-123',
        shopName: 'Cachee Official',
      },
      permissions: [Permission.FINANCE_VIEW, Permission.ORDER_VIEW],
    };

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
