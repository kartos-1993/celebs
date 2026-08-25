import { Permission } from './permissions';

export type PermissionModuleKey =
  | 'PRODUCTS'
  | 'CATALOG'
  | 'ORDERS'
  | 'FINANCE'
  | 'TEAM_AND_VENDORS'
  | 'PLATFORM';

export interface PermissionDefinition {
  perm: Permission;
  label: string;
  description: string;
  module: PermissionModuleKey;
}

export interface PermissionModuleInfo {
  key: PermissionModuleKey;
  label: string;
  description: string;
  iconKey: string;
  order: number;
}

export const PERMISSION_MODULES: Record<PermissionModuleKey, PermissionModuleInfo> = {
  PRODUCTS: {
    key: 'PRODUCTS',
    label: 'Products & Media Space',
    description: 'Catalog listings, stock matrix, DAM picture space, and asset uploads.',
    iconKey: 'package',
    order: 1,
  },
  CATALOG: {
    key: 'CATALOG',
    label: 'Catalog & Brand Gating',
    description: 'Taxonomy, categories, attributes, option sets, and brand authorizations.',
    iconKey: 'layers',
    order: 2,
  },
  ORDERS: {
    key: 'ORDERS',
    label: 'Orders & Customers',
    description: 'Fulfillment workflows, tracking, refunds, reviews, and customer accounts.',
    iconKey: 'shopping-cart',
    order: 3,
  },
  FINANCE: {
    key: 'FINANCE',
    label: 'Finance & Payouts',
    description: 'Shop ledger, financial balances, settlement statements, and bank payouts.',
    iconKey: 'receipt',
    order: 4,
  },
  TEAM_AND_VENDORS: {
    key: 'TEAM_AND_VENDORS',
    label: 'Team & Sub-Accounts',
    description: 'Employee roster, granular role delegation, and vendor KYC records.',
    iconKey: 'shield-check',
    order: 5,
  },
  PLATFORM: {
    key: 'PLATFORM',
    label: 'Platform Governance',
    description: 'Global system configuration, runtime feature flags, and platform settings.',
    iconKey: 'settings',
    order: 6,
  },
};

export const PERMISSION_REGISTRY: Record<Permission, PermissionDefinition> = {
  [Permission.PRODUCT_VIEW]: {
    perm: Permission.PRODUCT_VIEW,
    label: 'View Products',
    description: 'Browse product catalog, stock quantities, and variant details',
    module: 'PRODUCTS',
  },
  [Permission.PRODUCT_CREATE]: {
    perm: Permission.PRODUCT_CREATE,
    label: 'Create Products',
    description: 'Draft and create new product listings in the store catalog',
    module: 'PRODUCTS',
  },
  [Permission.PRODUCT_EDIT]: {
    perm: Permission.PRODUCT_EDIT,
    label: 'Edit Products',
    description: 'Modify pricing, descriptions, SKU matrices, and inventory levels',
    module: 'PRODUCTS',
  },
  [Permission.PRODUCT_DELETE]: {
    perm: Permission.PRODUCT_DELETE,
    label: 'Delete Products',
    description: 'Archive or permanently delete product records',
    module: 'PRODUCTS',
  },
  [Permission.PRODUCT_PUBLISH]: {
    perm: Permission.PRODUCT_PUBLISH,
    label: 'Publish Products',
    description: 'Push reviewed product listings live to the storefront',
    module: 'PRODUCTS',
  },
  [Permission.PRODUCT_REVIEW]: {
    perm: Permission.PRODUCT_REVIEW,
    label: 'Product Moderation',
    description: 'Moderate product quality flags and seller submissions',
    module: 'PRODUCTS',
  },
  [Permission.MEDIA_VIEW]: {
    perm: Permission.MEDIA_VIEW,
    label: 'View Media Assets',
    description: 'Browse Picture Space digital asset management library',
    module: 'PRODUCTS',
  },
  [Permission.MEDIA_MANAGE]: {
    perm: Permission.MEDIA_MANAGE,
    label: 'Manage Media Assets',
    description: 'Upload, delete, and organize brand image and video assets',
    module: 'PRODUCTS',
  },

  [Permission.CATALOG_VIEW]: {
    perm: Permission.CATALOG_VIEW,
    label: 'View Catalog Taxonomy',
    description: 'Inspect categories, attribute schemas, and option sets',
    module: 'CATALOG',
  },
  [Permission.CATALOG_MANAGE]: {
    perm: Permission.CATALOG_MANAGE,
    label: 'Manage Catalog Taxonomy',
    description: 'Create and update category hierarchies and option sets',
    module: 'CATALOG',
  },
  [Permission.BRAND_VIEW]: {
    perm: Permission.BRAND_VIEW,
    label: 'View Brands',
    description: 'Browse brand directory and authorization requirements',
    module: 'CATALOG',
  },
  [Permission.BRAND_MANAGE]: {
    perm: Permission.BRAND_MANAGE,
    label: 'Manage Brands',
    description: 'Configure brand gating, authorizations, and licenses',
    module: 'CATALOG',
  },

  [Permission.ORDER_VIEW]: {
    perm: Permission.ORDER_VIEW,
    label: 'View Orders',
    description: 'Inspect customer orders, invoices, and shipment progress',
    module: 'ORDERS',
  },
  [Permission.ORDER_MANAGE]: {
    perm: Permission.ORDER_MANAGE,
    label: 'Fulfill & Manage Orders',
    description: 'Update shipment status, print labels, and handle return requests',
    module: 'ORDERS',
  },
  [Permission.USER_VIEW]: {
    perm: Permission.USER_VIEW,
    label: 'View Customer Profiles',
    description: 'Access customer accounts and order histories',
    module: 'ORDERS',
  },
  [Permission.USER_MANAGE]: {
    perm: Permission.USER_MANAGE,
    label: 'Manage Customers',
    description: 'Update customer profiles and address books',
    module: 'ORDERS',
  },

  [Permission.FINANCE_VIEW]: {
    perm: Permission.FINANCE_VIEW,
    label: 'View Finance Reports',
    description: 'Review shop revenue, payout ledgers, and earnings breakdown',
    module: 'FINANCE',
  },
  [Permission.FINANCE_MANAGE]: {
    perm: Permission.FINANCE_MANAGE,
    label: 'Manage Payouts',
    description: 'Initiate and approve bank payouts and settlement transfers',
    module: 'FINANCE',
  },

  [Permission.STAFF_VIEW]: {
    perm: Permission.STAFF_VIEW,
    label: 'View Staff Roster',
    description: 'Browse employee sub-accounts and delegated permissions',
    module: 'TEAM_AND_VENDORS',
  },
  [Permission.STAFF_MANAGE]: {
    perm: Permission.STAFF_MANAGE,
    label: 'Manage Staff Sub-Accounts',
    description: 'Invite employees and update custom capability delegations',
    module: 'TEAM_AND_VENDORS',
  },
  [Permission.VENDOR_VIEW]: {
    perm: Permission.VENDOR_VIEW,
    label: 'View Vendors',
    description: 'Inspect vendor onboarding applications and store profiles',
    module: 'TEAM_AND_VENDORS',
  },
  [Permission.VENDOR_MANAGE]: {
    perm: Permission.VENDOR_MANAGE,
    label: 'Manage Vendors',
    description: 'Approve, suspend, or modify vendor accounts and KYC status',
    module: 'TEAM_AND_VENDORS',
  },

  [Permission.PLATFORM_MANAGE]: {
    perm: Permission.PLATFORM_MANAGE,
    label: 'Platform Governance',
    description: 'System-wide feature flags, runtime variables, and platform settings',
    module: 'PLATFORM',
  },
};

export interface GroupedPermissions {
  module: PermissionModuleInfo;
  permissions: PermissionDefinition[];
}

/**
 * Returns permissions grouped by functional module in display order.
 */
export function getGroupedPermissions(): GroupedPermissions[] {
  const modules = Object.values(PERMISSION_MODULES).sort((a, b) => a.order - b.order);
  const definitions = Object.values(PERMISSION_REGISTRY);

  return modules.map((mod) => ({
    module: mod,
    permissions: definitions.filter((d) => d.module === mod.key),
  }));
}

export interface StaffRolePreset {
  id: string;
  label: string;
  description: string;
  iconKey: string;
  permissions: Permission[];
}

export const STAFF_ROLE_PRESETS: StaffRolePreset[] = [
  {
    id: 'inventory',
    label: 'Product & Inventory Lead',
    description: 'Can manage catalog products, upload media assets, and update stock.',
    iconKey: 'package',
    permissions: [
      Permission.PRODUCT_VIEW,
      Permission.PRODUCT_CREATE,
      Permission.PRODUCT_EDIT,
      Permission.PRODUCT_DELETE,
      Permission.MEDIA_VIEW,
      Permission.MEDIA_MANAGE,
      Permission.BRAND_VIEW,
    ],
  },
  {
    id: 'fulfillment',
    label: 'Order Fulfillment Agent',
    description: 'Can view and fulfill orders, print labels, handle returns and reviews.',
    iconKey: 'truck',
    permissions: [
      Permission.ORDER_VIEW,
      Permission.ORDER_MANAGE,
      Permission.PRODUCT_VIEW,
      Permission.USER_VIEW,
    ],
  },
  {
    id: 'accountant',
    label: 'Finance Accountant',
    description: 'Can view shop earnings, payout ledgers, and financial balance statements.',
    iconKey: 'receipt',
    permissions: [Permission.FINANCE_VIEW, Permission.FINANCE_MANAGE, Permission.ORDER_VIEW],
  },
  {
    id: 'full_manager',
    label: 'Full Store Manager',
    description:
      'Complete operational delegation across products, media, orders, finance, and team.',
    iconKey: 'shield-check',
    permissions: [
      Permission.PRODUCT_VIEW,
      Permission.PRODUCT_CREATE,
      Permission.PRODUCT_EDIT,
      Permission.PRODUCT_DELETE,
      Permission.PRODUCT_PUBLISH,
      Permission.CATALOG_VIEW,
      Permission.CATALOG_MANAGE,
      Permission.MEDIA_VIEW,
      Permission.MEDIA_MANAGE,
      Permission.BRAND_VIEW,
      Permission.ORDER_VIEW,
      Permission.ORDER_MANAGE,
      Permission.FINANCE_VIEW,
      Permission.STAFF_VIEW,
      Permission.STAFF_MANAGE,
    ],
  },
];
