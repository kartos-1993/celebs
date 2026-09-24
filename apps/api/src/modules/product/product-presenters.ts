import type {
  AdminListCategory,
  AdminProductDetail,
  AdminProductListItem,
  SkuPriceEntry,
  StorefrontCard,
  StorefrontDetail,
  StorefrontDetailColorVariant,
} from '@celebs/shared-types';

type PriceRange = { min: number; max: number };

// ── Private Type Coercion & Extraction Helpers ──────────────────────────────

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value ? value : fallback;
}

function optStr(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function nullStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optNum(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toPositiveNumber(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function validDiscount(price: number, discounted: unknown): number | undefined {
  const value = Number(discounted);
  return Number.isFinite(value) && value > 0 && value < price ? value : undefined;
}

function cleanStringArray(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function asSkuList(skus: unknown): SkuPriceEntry[] {
  if (!Array.isArray(skus)) return [];
  const out: SkuPriceEntry[] = [];
  for (const entry of skus) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const price = toPositiveNumber(record.price);
    if (price === undefined) continue;
    const options: Record<string, string> = {};
    const rawOptions = record.selectedOptions;
    if (rawOptions && typeof rawOptions === 'object') {
      for (const [key, value] of Object.entries(rawOptions as Record<string, unknown>)) {
        if (value !== undefined && value !== null) options[key] = String(value);
      }
    }
    out.push({
      options,
      price,
      discountedPrice: validDiscount(price, record.discountedPrice),
      stock: Math.max(0, Number(record.stock ?? 0) || 0),
    });
  }
  return out;
}

function resolveComboPrices(skus: unknown): SkuPriceEntry[] {
  return asSkuList(skus);
}

function resolvePriceRange(
  skus: unknown,
  basePrice: unknown,
  baseDiscounted: unknown,
): { range: PriceRange; minDiscounted?: number } {
  const list = asSkuList(skus);
  const base = toPositiveNumber(basePrice) ?? 0;
  if (list.length === 0) {
    return { range: { min: base, max: base }, minDiscounted: validDiscount(base, baseDiscounted) };
  }
  const deals = list.map((s) => s.discountedPrice ?? s.price);
  const min = Math.min(...deals);
  const max = Math.max(...list.map((s) => s.price));
  const cheapest = list.find((s) => (s.discountedPrice ?? s.price) === min);
  return { range: { min, max }, minDiscounted: cheapest?.discountedPrice };
}

function resolveCover(mainImages: unknown, colorVariants: unknown): string | undefined {
  if (Array.isArray(mainImages)) {
    const first = mainImages.find(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
    if (first) return first.trim();
  }
  if (Array.isArray(colorVariants)) {
    for (const variant of colorVariants) {
      const images = (variant as Record<string, unknown> | null)?.images;
      if (Array.isArray(images)) {
        const first = images.find(
          (item): item is string => typeof item === 'string' && item.trim().length > 0,
        );
        if (first) return first.trim();
      }
    }
  }
  return undefined;
}

function resolveStockTotal(skus: unknown, colorVariants?: unknown): number {
  const skuList = asSkuList(skus);
  if (skuList.length > 0) {
    return skuList.reduce((sum, sku) => sum + (sku.stock ?? 0), 0);
  }
  if (!Array.isArray(colorVariants)) return 0;
  let total = 0;
  for (const variant of colorVariants) {
    const stocks = (variant as Record<string, unknown> | null)?.stocks;
    if (!Array.isArray(stocks)) continue;
    for (const entry of stocks) {
      const quantity = Number((entry as Record<string, unknown> | null)?.quantity ?? 0);
      if (Number.isFinite(quantity) && quantity > 0) total += quantity;
    }
  }
  return total;
}

function stripSwatchDupe(images: unknown, swatch: unknown): string[] {
  const list = cleanStringArray(images);
  if (typeof swatch === 'string' && swatch && list[0] === swatch) {
    return list.slice(1);
  }
  return list;
}

function resolveDisplaySizes(
  sizes: unknown,
  colorVariants: unknown,
): Array<{ name: string; productMeasurements?: unknown[]; bodyMeasurements?: unknown[] }> {
  if (Array.isArray(sizes) && sizes.length > 0) {
    return sizes as Array<{
      name: string;
      productMeasurements?: unknown[];
      bodyMeasurements?: unknown[];
    }>;
  }
  const seen = new Map<string, string>();
  if (Array.isArray(colorVariants)) {
    for (const variant of colorVariants) {
      const stocks = (variant as Record<string, unknown> | null)?.stocks;
      if (!Array.isArray(stocks)) continue;
      for (const entry of stocks) {
        const name = (entry as Record<string, unknown> | null)?.size;
        if (typeof name === 'string' && name.trim() && !seen.has(name.toLowerCase())) {
          seen.set(name.toLowerCase(), name);
        }
      }
    }
  }
  return [...seen.values()].map((name) => ({ name }));
}

function toListCategory(value: unknown): AdminListCategory | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.name !== 'string' || !record.name) {
    return null;
  }
  return {
    id: record.id,
    name: record.name,
    imageUrl: optStr(record.imageUrl),
  };
}

// ── Canonical Presenters per Consumer ───────────────────────────────────────

/**
 * Grid card answer (Storefront browse, Wishlist, Recently Viewed, Top Sellers):
 * 13 exact declared fields. Zero heavy descriptions or inventory matrices.
 */
export function formatStorefrontCard(formatted: Record<string, unknown>): StorefrontCard {
  const price = num(formatted.price);
  const { range, minDiscounted } = resolvePriceRange(
    formatted.skus,
    formatted.price,
    formatted.discountedPrice,
  );
  const colorVariants = Array.isArray(formatted.colorVariants) ? formatted.colorVariants : [];

  return {
    id: str(formatted.id),
    name: str(formatted.name),
    brand: nullStr(formatted.brand),
    cover: resolveCover(formatted.mainImages, colorVariants),
    price,
    discountedPrice: optNum(formatted.discountedPrice),
    minPrice: range.min,
    minDiscounted,
    ratingAverage: optNum(formatted.ratingAverage),
    ratingCount: optNum(formatted.ratingCount),
    inStock: formatted.inStock !== false,
    colorVariants: colorVariants.map((entry) => {
      const variant = (entry ?? {}) as Record<string, unknown>;
      return {
        name: str(variant.name, 'Variant'),
        images: cleanStringArray(variant.images),
      };
    }),
  };
}

/**
 * Full PDP answer: 19 exact declared fields.
 * Pre-calculated combos, swatches, and size availability.
 */
export function formatStorefrontDetail(formatted: Record<string, unknown>): StorefrontDetail {
  const colorVariantsRaw = Array.isArray(formatted.colorVariants) ? formatted.colorVariants : [];
  const colorVariants: StorefrontDetailColorVariant[] = colorVariantsRaw.map((entry) => {
    const variant = (entry ?? {}) as Record<string, unknown>;
    const swatch = optStr(variant.swatch);
    const stocks = Array.isArray(variant.stocks)
      ? (variant.stocks as Array<{ size: string; quantity: number }>)
      : undefined;
    return {
      name: str(variant.name, 'Variant'),
      colorCode: optStr(variant.colorCode),
      swatch,
      images: stripSwatchDupe(variant.images, swatch),
      stocks,
    };
  });
  const price = num(formatted.price);
  const comboPrices = resolveComboPrices(formatted.skus);
  const { range, minDiscounted } = resolvePriceRange(
    formatted.skus,
    formatted.price,
    formatted.discountedPrice,
  );

  return {
    id: str(formatted.id),
    name: str(formatted.name),
    brand: nullStr(formatted.brand),
    description: str(formatted.description),
    price,
    discountedPrice: optNum(formatted.discountedPrice),
    cover: resolveCover(formatted.mainImages, colorVariants),
    sizes: resolveDisplaySizes(formatted.sizes, colorVariants),
    colorVariants,
    comboPrices,
    priceRange: range,
    minDiscounted,
    ratingAverage: optNum(formatted.ratingAverage),
    ratingCount: optNum(formatted.ratingCount),
    inStock: formatted.inStock !== false,
    category: formatted.category ?? formatted.categoryId ?? null,
    subcategory: formatted.subcategory ?? formatted.subcategoryId ?? null,
    status: nullStr(formatted.status),
    vendorId: nullStr(formatted.vendorId),
  };
}

/**
 * Manage-table row: 11 exact declared fields.
 * One cover, one stock number, no galleries or drafts.
 */
export function formatAdminProductListItem(
  formatted: Record<string, unknown>,
): AdminProductListItem {
  return {
    id: str(formatted.id),
    name: str(formatted.name),
    slug: nullStr(formatted.slug),
    price: num(formatted.price),
    discountedPrice: optNum(formatted.discountedPrice),
    cover: resolveCover(formatted.mainImages, formatted.colorVariants),
    status: nullStr(formatted.status),
    stockTotal: resolveStockTotal(formatted.skus, formatted.colorVariants),
    vendorName: nullStr(formatted.vendorName),
    category: toListCategory(formatted.category),
    updatedAt: formatted.updatedAt ?? null,
  };
}

export const formatAdminListItem = formatAdminProductListItem;

/**
 * Admin detail (add/edit form): elevated consumer that sees everything,
 * including edit helpers (draft mirror, audit fields, skus).
 */
export function formatAdminDetail(formatted: Record<string, unknown>): AdminProductDetail {
  const price = num(formatted.price);
  const colorVariants = Array.isArray(formatted.colorVariants) ? formatted.colorVariants : [];
  const mainImagesRaw = cleanStringArray(formatted.mainImages);
  const mainImages = mainImagesRaw.length > 0 ? mainImagesRaw : undefined;

  const createdAt =
    formatted.createdAt instanceof Date || typeof formatted.createdAt === 'string'
      ? formatted.createdAt
      : undefined;
  const updatedAt =
    formatted.updatedAt instanceof Date || typeof formatted.updatedAt === 'string'
      ? formatted.updatedAt
      : undefined;

  return {
    id: str(formatted.id),
    name: str(formatted.name),
    slug: optStr(formatted.slug),
    brand: nullStr(formatted.brand),
    brandId: nullStr(formatted.brandId),
    description: optStr(formatted.description),
    price,
    discountedPrice: optNum(formatted.discountedPrice),
    cover: resolveCover(formatted.mainImages, colorVariants),
    mainImages,
    sizes: Array.isArray(formatted.sizes) ? formatted.sizes : undefined,
    colorVariants,
    skus: Array.isArray(formatted.skus) ? formatted.skus : undefined,
    variantOptions: Array.isArray(formatted.variantOptions) ? formatted.variantOptions : undefined,
    dynamicData:
      formatted.dynamicData && typeof formatted.dynamicData === 'object'
        ? (formatted.dynamicData as Record<string, unknown>)
        : undefined,
    tags: Array.isArray(formatted.tags)
      ? formatted.tags.filter((t): t is string => typeof t === 'string')
      : undefined,
    featured: typeof formatted.featured === 'boolean' ? formatted.featured : undefined,
    status: str(formatted.status, 'DRAFT'),
    vendorId: nullStr(formatted.vendorId),
    vendorName: nullStr(formatted.vendorName),
    categoryId: optStr(formatted.categoryId),
    subcategoryId: optStr(formatted.subcategoryId),
    category: formatted.category ?? formatted.categoryId ?? null,
    subcategory: formatted.subcategory ?? formatted.subcategoryId ?? null,
    reviewNote: nullStr(formatted.reviewNote),
    rejectionReasonCategory: nullStr(formatted.rejectionReasonCategory),
    rejectionSubcategories: Array.isArray(formatted.rejectionSubcategories)
      ? formatted.rejectionSubcategories.filter((s): s is string => typeof s === 'string')
      : undefined,
    rejectionFields: Array.isArray(formatted.rejectionFields)
      ? formatted.rejectionFields.filter((f): f is string => typeof f === 'string')
      : undefined,
    createdAt,
    updatedAt,
  };
}
