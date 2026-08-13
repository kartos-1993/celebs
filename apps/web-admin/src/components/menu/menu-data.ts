import {
  Users,
  ListOrdered,
  ShoppingBag,
  FolderTree,
  IndianRupee,
  Store,
  UserCog,
  UserPen,
  LucideIcon,
} from 'lucide-react';
import { Permission, can, type Role } from '@celebs/rbac';

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
  menus: Menu[];
};

export function getMenuList(role?: string, userPermissions?: string[]): Group[] {
  const list: Group[] = [];
  const currentRole = (role?.toUpperCase() || 'STAFF') as Role;

  const hasPerm = (perm: Permission): boolean => {
    return can(currentRole, perm, userPermissions);
  };

  // 1. Products Operations Group
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
    list.push({
      menus: [
        {
          href: '',
          label: 'Products',
          icon: ShoppingBag,
          submenus: productSubmenus,
        },
      ],
    });
  }

  // 2. Catalog & Taxonomy Architecture Group
  const catalogSubmenus: Submenu[] = [];
  if (hasPerm(Permission.CATALOG_MANAGE)) {
    catalogSubmenus.push({ href: '/categories', label: 'Categories' });
    catalogSubmenus.push({ href: '/option-sets', label: 'Option Sets' });
  }

  if (catalogSubmenus.length > 0) {
    list.push({
      menus: [
        {
          href: '',
          label: 'Catalog Setup',
          icon: FolderTree,
          submenus: catalogSubmenus,
        },
      ],
    });
  }

  // 3. Orders & Reviews Group
  if (hasPerm(Permission.ORDER_VIEW)) {
    list.push({
      menus: [
        {
          href: '',
          label: 'Orders & Reviews',
          icon: ListOrdered,
          submenus: [
            { href: '/orders', label: 'Orders' },
            { href: '/orders/return', label: 'Return Orders' },
            { href: '/orders/reviews', label: 'Reviews' },
          ],
        },
      ],
    });
  }

  // 4. Vendor Management (Admin & SuperAdmin)
  if (hasPerm(Permission.VENDOR_MANAGE) || hasPerm(Permission.VENDOR_VIEW)) {
    list.push({
      menus: [
        {
          href: '/vendors',
          label: 'Vendor Management',
          icon: Store,
        },
      ],
    });
  }

  // 5. User Management (SuperAdmin only)
  if (hasPerm(Permission.USER_MANAGE) || hasPerm(Permission.USER_VIEW)) {
    list.push({
      menus: [
        {
          href: '/users',
          label: 'User Management',
          icon: UserCog,
        },
      ],
    });
  }

  // 6. Staff & Team Management (Vendor Owners, Vendor Staff & SuperAdmin)
  if (hasPerm(Permission.STAFF_MANAGE) || hasPerm(Permission.STAFF_VIEW)) {
    list.push({
      menus: [
        {
          href: '/staff',
          label: 'Staff & Team',
          icon: Users,
        },
      ],
    });
  }

  // 7. Finance Group
  if (hasPerm(Permission.FINANCE_VIEW)) {
    list.push({
      menus: [
        {
          href: '',
          label: 'Finance',
          icon: IndianRupee,
          submenus: [{ href: '/finance', label: 'Finance' }],
        },
      ],
    });
  }

  // 8. My Account Group (All roles)
  list.push({
    menus: [
      {
        href: '/account/profile',
        label: 'My Account',
        icon: UserPen,
      },
    ],
  });

  return list;
}
