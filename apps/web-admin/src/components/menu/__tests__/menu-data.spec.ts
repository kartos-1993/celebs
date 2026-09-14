import { describe, expect, it } from 'vitest';

import { Permission } from '@celebs/rbac';

import { getMenuList } from '../menu-data';

// Helper to extract top-level menu labels
function getMenuLabels(role?: string, permissions?: string[]): string[] {
  const groups = getMenuList(role, permissions);
  return groups.flatMap((group) => group.menus.map((m) => m.label));
}

// Helper to extract section (group) labels in order
function getGroupLabels(role?: string, permissions?: string[]): Array<string | undefined> {
  return getMenuList(role, permissions).map((group) => group.label);
}
function getSubmenuLabels(menuLabel: string, role?: string, permissions?: string[]): string[] {
  const groups = getMenuList(role, permissions);
  for (const group of groups) {
    const menu = group.menus.find((m) => m.label === menuLabel);
    if (menu && menu.submenus) {
      return menu.submenus.map((s) => s.label);
    }
  }
  return [];
}

describe('Menu Data Complete RBAC & Permission Matrix Suite', () => {
  describe('SUPERADMIN Role', () => {
    it('should have access to all 10 platform menu groups and complete submenus', () => {
      const labels = getMenuLabels('SUPERADMIN');

      expect(labels).toContain('Products');
      expect(labels).toContain('Catalog Setup');
      expect(labels).toContain('Orders & Reviews');
      expect(labels).toContain('Marketing & SDUI');
      expect(labels).toContain('Vendor Management');
      expect(labels).toContain('User Management');
      expect(labels).toContain('Staff & Team');
      expect(labels).toContain('Finance');
      expect(labels).toContain('Platform Layout');
      expect(labels).toContain('My Account');

      // SuperAdmin must see the staff Review Queue under Products
      const productSubmenus = getSubmenuLabels('Products', 'SUPERADMIN');
      expect(productSubmenus).toContain('Review Queue');
      expect(productSubmenus).toContain('Manage Product');
      expect(productSubmenus).toContain('Add Product');
      expect(productSubmenus).toContain('Media Center');

      // SuperAdmin must see Home Layout Editor under Platform Layout
      const platformSubmenus = getSubmenuLabels('Platform Layout', 'SUPERADMIN');
      expect(platformSubmenus).toContain('Home Layout Editor');
      expect(platformSubmenus).toContain('Mobile Banner Slider');
    });
  });

  describe('ADMIN Role', () => {
    it('should have access to products, reviews, orders, marketing, vendor, user, staff, and finance', () => {
      const labels = getMenuLabels('ADMIN');

      expect(labels).toContain('Products');
      expect(labels).toContain('Orders & Reviews');
      expect(labels).toContain('Marketing & SDUI');
      expect(labels).toContain('Vendor Management');
      expect(labels).toContain('User Management');
      expect(labels).toContain('Staff & Team');
      expect(labels).toContain('Finance');
      expect(labels).toContain('My Account');

      // ADMIN has PRODUCT_REVIEW permission
      const productSubmenus = getSubmenuLabels('Products', 'ADMIN');
      expect(productSubmenus).toContain('Review Queue');

      // ADMIN does NOT have CATALOG_MANAGE or PLATFORM_MANAGE by default in RBAC
      expect(labels).not.toContain('Catalog Setup');
      expect(labels).not.toContain('Platform Layout');
    });

    it('should show Catalog Setup for ADMIN when granted CATALOG_MANAGE permission', () => {
      const labels = getMenuLabels('ADMIN', [Permission.CATALOG_MANAGE]);
      expect(labels).toContain('Catalog Setup');
    });
  });

  describe('VENDOR Role', () => {
    it('should have access only to vendor-scoped operational menus', () => {
      const labels = getMenuLabels('VENDOR');

      expect(labels).toContain('Products');
      expect(labels).toContain('Orders & Reviews');
      expect(labels).toContain('Staff & Team');
      expect(labels).toContain('Finance');
      expect(labels).toContain('My Account');
    });

    it('should NEVER see platform-level admin menus', () => {
      const labels = getMenuLabels('VENDOR');

      expect(labels).not.toContain('Marketing & SDUI');
      expect(labels).not.toContain('Platform Layout');
      expect(labels).not.toContain('Catalog Setup');
      expect(labels).not.toContain('Vendor Management');
      expect(labels).not.toContain('User Management');

      // Under Products, vendor must NOT see the staff Review Queue
      const productSubmenus = getSubmenuLabels('Products', 'VENDOR');
      expect(productSubmenus).not.toContain('Review Queue');
      expect(productSubmenus).toContain('Manage Product');
      expect(productSubmenus).toContain('Add Product');
      expect(productSubmenus).toContain('Media Center');
    });
  });

  describe('STAFF Role (Granular Dynamic Permissions)', () => {
    it('should see only My Account when granted 0 permissions', () => {
      const labels = getMenuLabels('STAFF', []);
      expect(labels).toEqual(['My Account']);
    });

    it('should see Products group only when granted product permissions, without Review Queue', () => {
      const labels = getMenuLabels('STAFF', [Permission.PRODUCT_VIEW, Permission.PRODUCT_CREATE]);
      expect(labels).toContain('Products');
      expect(labels).toContain('My Account');
      expect(labels).not.toContain('Orders & Reviews');
      expect(labels).not.toContain('Marketing & SDUI');
      expect(labels).not.toContain('Staff & Team');
      expect(labels).not.toContain('Finance');

      const productSubmenus = getSubmenuLabels('Products', 'STAFF', [
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_CREATE,
      ]);
      expect(productSubmenus).not.toContain('Review Queue');
      expect(productSubmenus).toContain('Manage Product');
    });

    it('should see Orders group only when granted order permissions', () => {
      const labels = getMenuLabels('STAFF', [Permission.ORDER_VIEW]);
      expect(labels).toContain('Orders & Reviews');
      expect(labels).toContain('My Account');
      expect(labels).not.toContain('Products');
      expect(labels).not.toContain('Marketing & SDUI');
      expect(labels).not.toContain('Finance');
    });

    it('should see Finance group only when granted finance permissions', () => {
      const labels = getMenuLabels('STAFF', [Permission.FINANCE_VIEW]);
      expect(labels).toContain('Finance');
      expect(labels).toContain('My Account');
      expect(labels).not.toContain('Products');
      expect(labels).not.toContain('Orders & Reviews');
    });

    it('should see Staff & Team only when granted staff management permissions', () => {
      const labels = getMenuLabels('STAFF', [Permission.STAFF_VIEW]);
      expect(labels).toContain('Staff & Team');
      expect(labels).toContain('My Account');
      expect(labels).not.toContain('Products');
    });

    it('should NEVER see platform administrative menus even with combined store permissions', () => {
      const fullStorePerms = [
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_EDIT,
        Permission.ORDER_VIEW,
        Permission.ORDER_MANAGE,
        Permission.FINANCE_VIEW,
        Permission.STAFF_VIEW,
      ];
      const labels = getMenuLabels('STAFF', fullStorePerms);

      expect(labels).not.toContain('Marketing & SDUI');
      expect(labels).not.toContain('Platform Layout');
      expect(labels).not.toContain('Catalog Setup');
      expect(labels).not.toContain('Vendor Management');
      expect(labels).not.toContain('User Management');
    });
  });

  describe('CUSTOMER Role', () => {
    it('should see only My Account in the admin panel', () => {
      const labels = getMenuLabels('CUSTOMER');
      expect(labels).toEqual(['My Account']);
    });
  });

  describe('Section Labels', () => {
    it('should group SUPERADMIN menus into Operations, Growth, Management, System in order', () => {
      expect(getGroupLabels('SUPERADMIN')).toEqual([
        'Operations',
        'Growth',
        'Management',
        'System',
      ]);
    });

    it('should omit the Growth section for VENDOR', () => {
      const labels = getGroupLabels('VENDOR');
      expect(labels).toContain('Operations');
      expect(labels).toContain('Management');
      expect(labels).toContain('System');
      expect(labels).not.toContain('Growth');
    });

    it('should render only the System section for permissionless STAFF', () => {
      expect(getGroupLabels('STAFF', [])).toEqual(['System']);
    });

    it('should never emit an empty section group', () => {
      for (const role of ['SUPERADMIN', 'ADMIN', 'VENDOR', 'STAFF', 'CUSTOMER']) {
        for (const group of getMenuList(role, [])) {
          expect(group.menus.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
