import { describe, expect, it } from 'vitest';

import {
  can,
  getUserPermissions,
  hasPermissionAccess,
  Permission,
  Role,
  ROLE_PERMISSIONS,
} from '../index';

describe('Hierarchical RBAC & Dynamic Permission System', () => {
  const ALL_PERMISSIONS = Object.values(Permission);
  const ALL_ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'VENDOR', 'STAFF', 'CUSTOMER'];

  describe('1. SUPERADMIN Role Evaluation', () => {
    it('SUPERADMIN should be granted every permission implicitly', () => {
      ALL_PERMISSIONS.forEach((perm) => {
        expect(can('SUPERADMIN', perm)).toBe(true);
      });
    });

    it('getUserPermissions for SUPERADMIN returns all platform permissions', () => {
      const perms = getUserPermissions('SUPERADMIN');
      expect(perms).toEqual(ALL_PERMISSIONS);
    });
  });

  describe('2. Default Role Presets', () => {
    it('ADMIN default permissions', () => {
      expect(can('ADMIN', Permission.PRODUCT_REVIEW)).toBe(true);
      expect(can('ADMIN', Permission.CATALOG_VIEW)).toBe(true);
      expect(can('ADMIN', Permission.VENDOR_MANAGE)).toBe(true);
      expect(can('ADMIN', Permission.PLATFORM_MANAGE)).toBe(false);
    });

    it('VENDOR default permissions', () => {
      expect(can('VENDOR', Permission.PRODUCT_CREATE)).toBe(true);
      expect(can('VENDOR', Permission.ORDER_MANAGE)).toBe(true);
      expect(can('VENDOR', Permission.FINANCE_VIEW)).toBe(true);
      expect(can('VENDOR', Permission.STAFF_MANAGE)).toBe(true);
      expect(can('VENDOR', Permission.CATALOG_MANAGE)).toBe(false);
      expect(can('VENDOR', Permission.PRODUCT_REVIEW)).toBe(false);
      expect(can('VENDOR', Permission.PLATFORM_MANAGE)).toBe(false);
    });

    it('STAFF default permissions (empty, relies on explicit sub-account delegation)', () => {
      ALL_PERMISSIONS.forEach((perm) => {
        expect(can('STAFF', perm)).toBe(false);
      });
    });

    it('CUSTOMER default permissions (empty)', () => {
      ALL_PERMISSIONS.forEach((perm) => {
        expect(can('CUSTOMER', perm)).toBe(false);
      });
    });
  });

  describe('3. Dynamic User Custom Permissions Overrides', () => {
    it('STAFF with custom granted permissions', () => {
      const customPerms = [Permission.FINANCE_VIEW, Permission.CATALOG_MANAGE];

      // Default STAFF without custom permissions cannot manage catalog or view finance
      expect(can('STAFF', Permission.FINANCE_VIEW)).toBe(false);
      expect(can('STAFF', Permission.CATALOG_MANAGE)).toBe(false);

      // With custom permissions assigned by Vendor Owner
      expect(can('STAFF', Permission.FINANCE_VIEW, customPerms)).toBe(true);
      expect(can('STAFF', Permission.CATALOG_MANAGE, customPerms)).toBe(true);
      // Unassigned permissions remain denied
      expect(can('STAFF', Permission.PRODUCT_CREATE, customPerms)).toBe(false);
    });

    it('VENDOR with custom granted permissions from Superadmin', () => {
      const customPerms = [Permission.PRODUCT_PUBLISH];

      // Default VENDOR cannot publish directly without review
      expect(can('VENDOR', Permission.PRODUCT_PUBLISH)).toBe(false);

      // Superadmin-granted custom override
      expect(can('VENDOR', Permission.PRODUCT_PUBLISH, customPerms)).toBe(true);
    });

    it('getUserPermissions merges default role permissions with custom array', () => {
      const custom = [Permission.FINANCE_MANAGE];
      const effective = getUserPermissions('VENDOR', custom);

      expect(effective).toContain(Permission.PRODUCT_CREATE);
      expect(effective).toContain(Permission.FINANCE_MANAGE);
    });
  });

  describe('4. Comprehensive Matrix Check Across All Roles and All Permissions', () => {
    ALL_ROLES.forEach((role) => {
      it(`evaluates all permissions deterministically for role: ${role}`, () => {
        const roleDefaults = ROLE_PERMISSIONS[role] ?? [];
        ALL_PERMISSIONS.forEach((perm) => {
          const expected = role === 'SUPERADMIN' || roleDefaults.includes(perm);
          expect(can(role, perm)).toBe(expected);
        });
      });
    });
  });

  describe('5. Polymorphic hasPermissionAccess & Mode Evaluation', () => {
    it('returns true when required permissions is undefined or empty', () => {
      expect(hasPermissionAccess('STAFF', [], undefined)).toBe(true);
      expect(hasPermissionAccess('STAFF', [], [])).toBe(true);
    });

    it('SUPERADMIN always returns true for single or multi-permission requirements', () => {
      expect(hasPermissionAccess('SUPERADMIN', [], Permission.PLATFORM_MANAGE)).toBe(true);
      expect(
        hasPermissionAccess(
          'SUPERADMIN',
          [],
          [Permission.PLATFORM_MANAGE, Permission.PRODUCT_DELETE],
          'ALL',
        ),
      ).toBe(true);
    });

    it('evaluates single permission correctly', () => {
      expect(hasPermissionAccess('VENDOR', [], Permission.PRODUCT_CREATE)).toBe(true);
      expect(hasPermissionAccess('VENDOR', [], Permission.PLATFORM_MANAGE)).toBe(false);
    });

    it('evaluates mode="ANY" correctly for STAFF with partial permissions', () => {
      const staffPerms = [Permission.PRODUCT_VIEW, Permission.ORDER_VIEW];
      expect(
        hasPermissionAccess(
          'STAFF',
          staffPerms,
          [Permission.PRODUCT_VIEW, Permission.FINANCE_VIEW],
          'ANY',
        ),
      ).toBe(true);
      expect(
        hasPermissionAccess(
          'STAFF',
          staffPerms,
          [Permission.FINANCE_VIEW, Permission.CATALOG_MANAGE],
          'ANY',
        ),
      ).toBe(false);
    });

    it('evaluates mode="ALL" correctly for STAFF requiring multiple permissions', () => {
      const staffPerms = [Permission.PRODUCT_VIEW, Permission.PRODUCT_CREATE];
      expect(
        hasPermissionAccess(
          'STAFF',
          staffPerms,
          [Permission.PRODUCT_VIEW, Permission.PRODUCT_CREATE],
          'ALL',
        ),
      ).toBe(true);
      expect(
        hasPermissionAccess(
          'STAFF',
          staffPerms,
          [Permission.PRODUCT_VIEW, Permission.PRODUCT_PUBLISH],
          'ALL',
        ),
      ).toBe(false);
    });
  });
});
