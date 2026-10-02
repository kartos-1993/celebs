export enum Permission {
  // ── Products ──────────────────────────
  PRODUCT_VIEW = 'product:view',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_EDIT = 'product:edit',
  PRODUCT_DELETE = 'product:delete',
  PRODUCT_PUBLISH = 'product:publish',

  // ── Catalog (Categories + Attributes) ─
  CATALOG_VIEW = 'catalog:view',
  CATALOG_MANAGE = 'catalog:manage',

  // ── Product Review/Moderation ──────────
  PRODUCT_REVIEW = 'product:review',

  // ── Brands ─────────────────────────────
  BRAND_VIEW = 'brand:view',
  BRAND_MANAGE = 'brand:manage',

  // ── Media DAM & Picture Space ─────────
  MEDIA_VIEW = 'media:view',
  MEDIA_MANAGE = 'media:manage',

  // ── Orders ────────────────────────────
  ORDER_VIEW = 'order:view',
  ORDER_MANAGE = 'order:manage',

  // ── Finance ───────────────────────────
  // A shop's own money. A vendor sees their own earnings, not the platform's.
  FINANCE_VIEW = 'finance:view',
  FINANCE_MANAGE = 'finance:manage',

  // The platform's own money: the courier ledger, what delivery costs across all
  // vendors, and settlements agreed with a courier.
  //
  // Deliberately separate from the pair above. Reusing FINANCE_VIEW here would
  // hand every seller a read on every other seller's delivery costs, because the
  // two are about different money: one is a shop's earnings, the other is the
  // whole marketplace's dealings with a courier.
  FINANCE_PLATFORM_VIEW = 'finance:platform:view',
  FINANCE_PLATFORM_MANAGE = 'finance:platform:manage',

  // ── Vendors ───────────────────────────
  VENDOR_VIEW = 'vendor:view',
  VENDOR_MANAGE = 'vendor:manage',

  // ── Staff ─────────────────────────────
  STAFF_VIEW = 'staff:view',
  STAFF_MANAGE = 'staff:manage',

  // ── Users (platform-wide) ────────────
  USER_VIEW = 'user:view',
  USER_MANAGE = 'user:manage',

  // ── Platform ──────────────────────────
  PLATFORM_MANAGE = 'platform:manage',
}
