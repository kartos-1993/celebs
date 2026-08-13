import { describe, expect, it } from 'vitest';
import { can, getUserPermissions, Permission, ROLE_PERMISSIONS, Role } from '../index';

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

    it('STAFF default permissions', () => {
      expect(can('STAFF', Permission.PRODUCT_CREATE)).toBe(true);
      expect(can('STAFF', Permission.ORDER_MANAGE)).toBe(true);
      expect(can('STAFF', Permission.STAFF_MANAGE)).toBe(false);
      expect(can('STAFF', Permission.FINANCE_VIEW)).toBe(false);
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

      // Default STAFF cannot manage catalog or view finance
      expect(can('STAFF', Permission.FINANCE_VIEW)).toBe(false);
      expect(can('STAFF', Permission.CATALOG_MANAGE)).toBe(false);

      // With custom permissions assigned by Vendor Owner
      expect(can('STAFF', Permission.FINANCE_VIEW, customPerms)).toBe(true);
      expect(can('STAFF', Permission.CATALOG_MANAGE, customPerms)).toBe(true);
      // Still retains default STAFF permissions
      expect(can('STAFF', Permission.PRODUCT_CREATE, customPerms)).toBe(true);
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
});
