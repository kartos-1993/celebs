import { Permission } from './permissions';

export type Role = 'CUSTOMER' | 'VENDOR' | 'STAFF' | 'ADMIN' | 'SUPERADMIN';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  CUSTOMER: [],
  STAFF: [],
  VENDOR: [
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_EDIT,
    Permission.PRODUCT_DELETE,
    Permission.CATALOG_VIEW,
    Permission.BRAND_VIEW,
    Permission.MEDIA_VIEW,
    Permission.MEDIA_MANAGE,
    Permission.ORDER_VIEW,
    Permission.ORDER_MANAGE,
    Permission.FINANCE_VIEW,
    Permission.SELLER_STATEMENT_VIEW,
    Permission.STAFF_VIEW,
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
    Permission.BRAND_VIEW,
    Permission.BRAND_MANAGE,
    Permission.MEDIA_VIEW,
    Permission.MEDIA_MANAGE,
    Permission.ORDER_VIEW,
    Permission.ORDER_MANAGE,
    Permission.FINANCE_VIEW,
    Permission.FINANCE_MANAGE,
    Permission.FINANCE_PLATFORM_VIEW,
    Permission.FINANCE_PLATFORM_MANAGE,
    Permission.COMMISSION_VIEW,
    // Seller statements: ADMIN prepares, approves and pays; SUPERADMIN inherits
    // everything. Split across three so a deployment can divide the work between
    // people, and the prepare/approve inequality is checked in the service.
    Permission.SELLER_STATEMENT_VIEW,
    Permission.SELLER_STATEMENT_PREPARE,
    Permission.SELLER_STATEMENT_APPROVE,
    Permission.SELLER_STATEMENT_PAY,
    Permission.VENDOR_VIEW,
    Permission.VENDOR_MANAGE,
    Permission.STAFF_VIEW,
    Permission.STAFF_MANAGE,
    Permission.USER_VIEW,
  ],
  SUPERADMIN: Object.values(Permission),
} as const;
