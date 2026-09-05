import {
  FolderTree,
  IndianRupee,
  LayoutTemplate,
  ListOrdered,
  LucideIcon,
  Megaphone,
  ShoppingBag,
  Store,
  UserCog,
  UserPen,
  Users,
} from 'lucide-react';

import { can, Permission, type Role } from '@celebs/rbac';

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type Menu = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
  submenus?: Submenu[];
};

type Group = {
  label?: string;
  menus: Menu[];
};

export function getMenuList(role?: string, userPermissions?: string[]): Group[] {
  const list: Group[] = [];
  const currentRole = (role?.toUpperCase() || 'STAFF') as Role;

  const hasPerm = (perm: Permission): boolean => {
    return can(currentRole, perm, userPermissions);
  };

  const pushGroup = (label: string, menus: Menu[]) => {
    if (menus.length > 0) list.push({ label, menus });
  };

  // 1. Operations: products, catalog, orders
  const operations: Menu[] = [];

  const productSubmenus: Submenu[] = [];
  if (hasPerm(Permission.PRODUCT_VIEW) || hasPerm(Permission.PRODUCT_CREATE)) {
    productSubmenus.push({ href: '/products/manage', label: 'Manage Product' });
    productSubmenus.push({ href: '/products/new', label: 'Add Product' });
    productSubmenus.push({ href: '/products/mediacenter', label: 'Media Center' });
  }
  if (hasPerm(Permission.PRODUCT_REVIEW)) {
    productSubmenus.push({ href: '/products/review-product-queue', label: 'Review Queue' });
  }
  if (productSubmenus.length > 0) {
    operations.push({ href: '', label: 'Products', icon: ShoppingBag, submenus: productSubmenus });
  }

  if (hasPerm(Permission.CATALOG_MANAGE)) {
    operations.push({
      href: '',
      label: 'Catalog Setup',
      icon: FolderTree,
      submenus: [
        { href: '/categories', label: 'Categories' },
        { href: '/option-sets', label: 'Option Sets' },
      ],
    });
  }

  if (hasPerm(Permission.ORDER_VIEW)) {
    operations.push({
      href: '',
      label: 'Orders & Reviews',
      icon: ListOrdered,
      submenus: [
        { href: '/orders', label: 'Orders' },
        { href: '/orders/return', label: 'Return Orders' },
        { href: '/orders/reviews', label: 'Reviews' },
      ],
    });
  }

  pushGroup('Operations', operations);

  // 2. Growth: marketing & promotions (platform admins only)
  if (
    hasPerm(Permission.PLATFORM_MANAGE) ||
    hasPerm(Permission.CATALOG_MANAGE) ||
    currentRole === 'ADMIN' ||
    currentRole === 'SUPERADMIN'
  ) {
    pushGroup('Growth', [
      {
        href: '',
        label: 'Marketing & SDUI',
        icon: Megaphone,
        submenus: [
          { href: '/marketing/campaigns', label: 'Festival Campaigns' },
          { href: '/marketing/combos', label: 'Combo Bundles' },
          { href: '/marketing/preview', label: 'SDUI Storefront Preview' },
        ],
      },
    ]);
  }

  // 3. Management: vendors, users, staff, finance
  const management: Menu[] = [];

  if (hasPerm(Permission.VENDOR_MANAGE) || hasPerm(Permission.VENDOR_VIEW)) {
    management.push({ href: '/vendors', label: 'Vendor Management', icon: Store });
  }

  if (hasPerm(Permission.USER_MANAGE) || hasPerm(Permission.USER_VIEW)) {
    management.push({ href: '/users', label: 'User Management', icon: UserCog });
  }

  if (hasPerm(Permission.STAFF_MANAGE) || hasPerm(Permission.STAFF_VIEW)) {
    management.push({ href: '/staff', label: 'Staff & Team', icon: Users });
  }

  if (hasPerm(Permission.FINANCE_VIEW)) {
    management.push({
      href: '',
      label: 'Finance',
      icon: IndianRupee,
      submenus: [{ href: '/finance', label: 'Finance' }],
    });
  }

  pushGroup('Management', management);

  // 4. System: platform layout + account (account visible to all roles)
  const system: Menu[] = [];

  if (hasPerm(Permission.PLATFORM_MANAGE)) {
    system.push({
      href: '',
      label: 'Platform Layout',
      icon: LayoutTemplate,
      submenus: [
        { href: '/platform-settings/banners', label: 'Mobile Banner Slider' },
        { href: '/platform-settings/layout', label: 'Home Layout Editor' },
      ],
    });
  }

  system.push({ href: '/account/profile', label: 'My Account', icon: UserPen });

  pushGroup('System', system);

  return list;
}
