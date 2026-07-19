import { Permission } from './permissions';

export type Role = 'CUSTOMER' | 'VENDOR' | 'STAFF' | 'ADMIN' | 'SUPERADMIN';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  CUSTOMER: [],
  STAFF: [
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_EDIT,
    Permission.CATALOG_VIEW,
    Permission.ORDER_VIEW,
    Permission.ORDER_MANAGE,
  ],
  VENDOR: [
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_EDIT,
    Permission.PRODUCT_DELETE,
    Permission.CATALOG_VIEW,
    Permission.ORDER_VIEW,
    Permission.ORDER_MANAGE,
    Permission.FINANCE_VIEW,
    Permission.STAFF_MANAGE,
  ],
  ADMIN: [
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_EDIT,
    Permission.PRODUCT_DELETE,
    Permission.PRODUCT_PUBLISH,
    Permission.PRODUCT_REVIEW,
    Permission.CATALOG_VIEW,
    Permission.ORDER_VIEW,
    Permission.ORDER_MANAGE,
    Permission.FINANCE_VIEW,
    Permission.FINANCE_MANAGE,
    Permission.VENDOR_VIEW,
    Permission.VENDOR_MANAGE,
  ],
  SUPERADMIN: Object.values(Permission),
} as const;
