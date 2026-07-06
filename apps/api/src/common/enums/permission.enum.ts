export enum Permission {
  // Products
  CREATE_PRODUCT    = 'product:create',
  PUBLISH_PRODUCT   = 'product:publish',
  DELETE_PRODUCT    = 'product:delete',

  // Categories
  MANAGE_CATEGORIES = 'category:manage',

  // Orders & Shipments
  VIEW_ORDERS       = 'orders:view',
  MANAGE_ORDERS     = 'orders:manage',

  // Business Operations
  VIEW_FINANCE      = 'finance:view',
  MANAGE_VENDORS    = 'vendors:manage',
  MANAGE_STAFF      = 'staff:manage',
}
