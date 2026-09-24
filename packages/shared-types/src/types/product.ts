/**
 * Canonical product lifecycle states.
 * Single source of truth across api, web-admin, and mobile apps.
 */
export const PRODUCT_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  DEACTIVATED: 'deactivated',
  ARCHIVED: 'archived',
} as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

/** Statuses a vendor may still modify (pre-approval lifecycle). */
export const VENDOR_EDITABLE_STATUSES: readonly ProductStatus[] = [
  PRODUCT_STATUS.DRAFT,
  PRODUCT_STATUS.REJECTED,
];

// ── Storefront Grid Card Contract (Exact 13 keys) ───────────────────────────
export interface StorefrontCardColorVariant {
  name: string;
  images: string[];
}

export interface StorefrontCard {
  id: string;
  name: string;
  brand: string | null;
  cover?: string;
  price: number;
  discountedPrice?: number;
  minPrice: number;
  minDiscounted?: number;
  ratingAverage?: number;
  ratingCount?: number;
  inStock: boolean;
  colorVariants: StorefrontCardColorVariant[];
}

// ── Storefront PDP Detail Contract (Exact 19 keys) ──────────────────────────
export interface StorefrontDetailColorVariant {
  name: string;
  colorCode?: string;
  swatch?: string;
  images: string[];
  stocks?: Array<{ size: string; quantity: number }>;
}

export interface StorefrontDetailSize {
  name: string;
  productMeasurements?: unknown[];
  bodyMeasurements?: unknown[];
}

export interface SkuPriceEntry {
  options?: Record<string, string>;
  price: number;
  discountedPrice?: number;
  stock?: number;
}

export interface StorefrontDetail {
  id: string;
  name: string;
  brand: string | null;
  description: string;
  price: number;
  discountedPrice?: number;
  cover?: string;
  sizes: StorefrontDetailSize[];
  colorVariants: StorefrontDetailColorVariant[];
  comboPrices: SkuPriceEntry[];
  priceRange: { min: number; max: number };
  minDiscounted?: number;
  ratingAverage?: number;
  ratingCount?: number;
  inStock: boolean;
  category: unknown;
  subcategory: unknown;
  status: string | null;
  vendorId: string | null;
}

// ── Admin Manage List Contract (Exact 11 keys) ──────────────────────────────
export interface AdminListCategory {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface AdminListItem {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  discountedPrice?: number;
  cover?: string;
  status: string | null;
  stockTotal: number;
  vendorName: string | null;
  category: AdminListCategory | null;
  updatedAt: unknown;
}

// ── Admin Elevated Detail Contract (Form Hydration) ─────────────────────────
export interface AdminProductDetail {
  id: string;
  name: string;
  slug?: string;
  brand?: string | null;
  brandId?: string | null;
  description?: string;
  price: number;
  discountedPrice?: number;
  cover?: string;
  mainImages?: string[];
  sizes?: unknown[];
  colorVariants?: unknown[];
  skus?: unknown[];
  variantOptions?: unknown[];
  dynamicData?: Record<string, unknown>;
  tags?: string[];
  featured?: boolean;
  status: ProductStatus | string;
  vendorId?: string | null;
  vendorName?: string | null;
  categoryId?: string;
  subcategoryId?: string;
  category?: unknown;
  subcategory?: unknown;
  reviewNote?: string | null;
  rejectionReasonCategory?: string | null;
  rejectionSubcategories?: string[];
  rejectionFields?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// ── Standard Paginated Envelope ─────────────────────────────────────────────
export interface PaginatedProductResponse<T> {
  products: T[];
  total?: number;
  nextCursor?: string;
  hasMore?: boolean;
}
