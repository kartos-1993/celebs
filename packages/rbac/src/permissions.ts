export enum Permission {
  // ── Products ──────────────────────────
  PRODUCT_VIEW          = 'product:view',
  PRODUCT_CREATE        = 'product:create',
  PRODUCT_EDIT          = 'product:edit',
  PRODUCT_DELETE        = 'product:delete',
  PRODUCT_PUBLISH       = 'product:publish',

  // ── Catalog (Categories + Attributes) ─
  CATALOG_VIEW          = 'catalog:view',
  CATALOG_MANAGE        = 'catalog:manage',

  // ── Orders ────────────────────────────
  ORDER_VIEW            = 'order:view',
  ORDER_MANAGE          = 'order:manage',

  // ── Finance ───────────────────────────
  FINANCE_VIEW          = 'finance:view',
  FINANCE_MANAGE        = 'finance:manage',

  // ── Vendors ───────────────────────────
  VENDOR_VIEW           = 'vendor:view',
  VENDOR_MANAGE         = 'vendor:manage',

  // ── Staff ─────────────────────────────
  STAFF_MANAGE          = 'staff:manage',

  // ── Users (platform-wide) ────────────
  USER_VIEW             = 'user:view',
  USER_MANAGE           = 'user:manage',

  // ── Platform ──────────────────────────
  PLATFORM_MANAGE       = 'platform:manage',
}
