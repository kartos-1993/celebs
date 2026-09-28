export type {
  SkuPriceEntry,
  StorefrontCard,
  StorefrontCardColorVariant,
  StorefrontDetail,
  StorefrontDetailColorVariant,
  StorefrontDetailSize,
} from '@celebs/shared-types';

export interface ProductMeasurement {
  name: string;
  value: string;
  unit: string;
}

export interface ProductSize {
  name: string;
  productMeasurements?: ProductMeasurement[];
  bodyMeasurements?: ProductMeasurement[];
}

export interface ProductStock {
  size: string;
  quantity: number;
}

export interface ProductColorVariant {
  name: string;
  colorCode?: string;
  swatch?: string;
  images?: string[];
  stocks?: ProductStock[];
}

export interface ProductVariantOption {
  name: string;
  values: string[];
}

export interface ProductSku {
  skuCode?: string;
  selectedOptions?: Record<string, string>;
  price: number;
  discountedPrice?: number;
  stock?: number;
}

export interface ProductComboPrice {
  options?: Record<string, string>;
  price: number;
  discountedPrice?: number;
  stock?: number;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  slug?: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  /**
   * Product gallery. The storefront product payload does NOT send this — the
   * only field a storefront client gets is the derived `cover` below. It is
   * kept optional because a wishlist row (the single payload that still carries
   * it) is projected onto this same shape.
   */
  mainImages?: string[];
  sizes?: ProductSize[];
  colorVariants?: ProductColorVariant[];
  variantOptions?: ProductVariantOption[];
  skus?: ProductSku[];
  comboPrices?: ProductComboPrice[];
  minPrice?: number;
  minDiscounted?: number;
  /**
   * THE primary image field. A single derived URL the API sends to every
   * storefront client: `mainImages[0]`, or the first colour's first photo when
   * the product has colour galleries but no explicit cover. Optional because a
   * product can legitimately carry no picture at all — callers must render an
   * empty state, never an invented remote placeholder.
   */
  cover?: string;
  /**
   * Publication status. Optional because some surfaces (e.g. the wishlist) get
   * a product-hydated view that legitimately carries no status — they must
   * never invent a 'published' value to satisfy a required field.
   */
  status?: string;
  featured?: boolean;
}

export interface ProductFilterParams {
  limit?: number;
  category?: string;
  cursor?: string | null;
  status?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  tag?: string;
  brandId?: string;
  sortBy?: 'createdAt' | 'price' | 'name';
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}
