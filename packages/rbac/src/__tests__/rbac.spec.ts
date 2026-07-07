import { describe, it, expect } from 'vitest';
import { can, Permission } from '../index';

describe('RBAC Authorization Rules', () => {
  it('SUPERADMIN should have all permissions', () => {
    Object.values(Permission).forEach((perm) => {
      expect(can('SUPERADMIN', perm)).toBe(true);
    });
  });

  it('VENDOR should have product, order, finance, and staff permissions, but not platform manage or catalog manage', () => {
    expect(can('VENDOR', Permission.PRODUCT_CREATE)).toBe(true);
    expect(can('VENDOR', Permission.ORDER_MANAGE)).toBe(true);
    expect(can('VENDOR', Permission.FINANCE_VIEW)).toBe(true);
    expect(can('VENDOR', Permission.STAFF_MANAGE)).toBe(true);
    expect(can('VENDOR', Permission.CATALOG_MANAGE)).toBe(false);
    expect(can('VENDOR', Permission.PLATFORM_MANAGE)).toBe(false);
  });

  it('STAFF should have view and basic manage permissions, but not finance manage or staff manage', () => {
    expect(can('STAFF', Permission.PRODUCT_CREATE)).toBe(true);
    expect(can('STAFF', Permission.ORDER_MANAGE)).toBe(true);
    expect(can('STAFF', Permission.STAFF_MANAGE)).toBe(false);
    expect(can('STAFF', Permission.FINANCE_VIEW)).toBe(false);
  });

  it('CUSTOMER should have no management permissions', () => {
    Object.values(Permission).forEach((perm) => {
      expect(can('CUSTOMER', perm)).toBe(false);
    });
  });
});
