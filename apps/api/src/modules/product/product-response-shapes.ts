import {
  type AdminListCategory,
  type AdminProductDetail,
  type AdminProductListItem,
  SHIPPING_DEFAULTS,
  type ShippingPackagingType,
  type SkuPriceEntry,
  type StorefrontCard,
  type StorefrontDetail,
  type StorefrontDetailColorVariant,
  type WarrantyType,
} from '@celebs/shared-types';
import { buildVariantKey, isPlaceholderVariant, validDiscount } from '@celebs/shared-utils';

import { resolveCover } from './utils/product-image.util';

type PriceRange = { min: number; max: number };

// Every `discountedPrice` emitted below goes through the shared `validDiscount`
// choke point (`@celebs/shared-utils`): no presenter read path can emit an
// invalid deal, so the persistence-side check stays in its own stream.

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

// CONTRACT: category/subcategory surface as the loaded object or NULL.
// A raw UUID string (no relation object loaded) is never passed through.
function objectOrNull(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

// One strip rule everywhere: drop a leading swatch duplicate from gallery images.
function stripVariantImages(variant: Record<string, unknown>): string[] {
  return stripSwatchDupe(variant.images, optStr(variant.swatch));
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
    discountedPrice: validDiscount(price, formatted.discountedPrice),
    minPrice: range.min,
    minDiscounted,
    ratingAverage: optNum(formatted.ratingAverage),
    ratingCount: optNum(formatted.ratingCount),
    inStock: formatted.inStock === true,
    colorVariants: colorVariants.map((entry) => {
      const variant = (entry ?? {}) as Record<string, unknown>;
      return {
        name: str(variant.name, 'Variant'),
        images: stripVariantImages(variant),
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
    discountedPrice: validDiscount(price, formatted.discountedPrice),
    cover: resolveCover(formatted.mainImages, colorVariantsRaw),
    sizes: resolveDisplaySizes(formatted.sizes, colorVariants),
    colorVariants,
    comboPrices,
    priceRange: range,
    minDiscounted,
    ratingAverage: optNum(formatted.ratingAverage),
    ratingCount: optNum(formatted.ratingCount),
    inStock: formatted.inStock === true,
    category: objectOrNull(formatted.category),
    subcategory: objectOrNull(formatted.subcategory),
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
    discountedPrice: validDiscount(num(formatted.price), formatted.discountedPrice),
    cover: resolveCover(formatted.mainImages, formatted.colorVariants),
    status: nullStr(formatted.status),
    stockTotal: resolveStockTotal(formatted.skus, formatted.colorVariants),
    vendorName: nullStr(formatted.vendorName),
    category: toListCategory(formatted.category),
    updatedAt: formatted.updatedAt ?? null,
  };
}

function optDate(value: unknown): Date | string | undefined {
  return value instanceof Date || typeof value === 'string' ? value : undefined;
}

function hasExplicitDefaultFlag(values: unknown[]): boolean {
  return values.some((v) => typeof v === 'boolean');
}

// CONTRACT: missing SKU price surfaces as NULL (never a base-price fallback).
function adminSkuPrice(matched: Record<string, unknown> | undefined): number | null {
  return toPositiveNumber(matched?.price) ?? null;
}

function adminSkuDiscounted(
  skuPrice: number | null,
  matched: Record<string, unknown> | undefined,
): number | undefined {
  if (skuPrice === null) return undefined;
  return validDiscount(skuPrice, matched?.discountedPrice);
}

// Missing stock stays 0; reason: no usable inventory/SKU quantity was supplied.
function adminSkuStock(quantity: unknown): number {
  return typeof quantity === 'number' && Number.isFinite(quantity) ? quantity : 0;
}

function matchInventorySku(
  rawSkus: Array<Record<string, unknown>>,
  expectedKey: string,
  isPlaceholderColor: boolean,
  isPlaceholderSize: boolean,
): Record<string, unknown> | undefined {
  return rawSkus.find((s) => {
    if (!s.selectedOptions || typeof s.selectedOptions !== 'object') {
      return isPlaceholderColor && isPlaceholderSize;
    }
    const optValues = Object.values(s.selectedOptions as Record<string, unknown>).map(String);
    return buildVariantKey(optValues) === expectedKey;
  });
}

function buildInventorySku(
  inv: Record<string, unknown>,
  idx: number,
  rawSkus: Array<Record<string, unknown>>,
  useFlag: boolean,
): Record<string, unknown> {
  const color = str(inv.colorVariantName);
  const size = str(inv.size);
  const isPlaceholderColor = isPlaceholderVariant(color);
  const isPlaceholderSize = isPlaceholderVariant(size);
  const matched = matchInventorySku(
    rawSkus,
    buildVariantKey([color, size]),
    isPlaceholderColor,
    isPlaceholderSize,
  );
  const selectedOptions: Record<string, string> = {};
  if (!isPlaceholderColor) selectedOptions['Color'] = color;
  if (!isPlaceholderSize) selectedOptions['Size'] = size;
  const skuPrice = adminSkuPrice(matched);
  const invDefault = typeof inv.isDefault === 'boolean' ? inv.isDefault : undefined;
  const clientDefault =
    matched && typeof matched.isDefault === 'boolean' ? (matched.isDefault as boolean) : undefined;
  return {
    skuCode: str(inv.sku),
    selectedOptions,
    price: skuPrice,
    discountedPrice: adminSkuDiscounted(skuPrice, matched),
    stock: adminSkuStock(inv.quantity),
    image: typeof matched?.image === 'string' ? matched.image : undefined,
    isDefault: useFlag ? (invDefault ?? clientDefault ?? false) : idx === 0,
  };
}

// Pipeline path (inventories were stripped by the base layer): normalize raw
// SKUs deterministically with the same clamp/flag rules instead of passing through.
function normalizeRawSku(
  entry: Record<string, unknown>,
  idx: number,
  useFlag: boolean,
): Record<string, unknown> {
  const skuPrice = toPositiveNumber(entry.price) ?? null;
  const selectedOptions: Record<string, string> = {};
  const rawOptions = entry.selectedOptions;
  if (rawOptions && typeof rawOptions === 'object') {
    for (const [key, value] of Object.entries(rawOptions as Record<string, unknown>)) {
      if (value !== undefined && value !== null) selectedOptions[key] = String(value);
    }
  }
  return {
    skuCode: str(entry.skuCode ?? entry.sku),
    selectedOptions,
    price: skuPrice,
    discountedPrice: adminSkuDiscounted(skuPrice, entry),
    stock: adminSkuStock(entry.stock ?? entry.quantity),
    image: typeof entry.image === 'string' ? entry.image : undefined,
    isDefault: useFlag
      ? typeof entry.isDefault === 'boolean'
        ? entry.isDefault
        : false
      : idx === 0,
  };
}

function resolveAdminSkus(
  rawInventories: unknown,
  rawSkus: Array<Record<string, unknown>>,
): AdminProductDetail['skus'] {
  const invList = Array.isArray(rawInventories)
    ? (rawInventories as Array<Record<string, unknown>>)
    : [];
  // Flag-first: row-index-0 wins ONLY when no explicit flag exists anywhere.
  const useFlag =
    hasExplicitDefaultFlag(invList.map((inv) => inv.isDefault)) ||
    hasExplicitDefaultFlag(rawSkus.map((s) => s.isDefault));
  if (invList.length > 0) {
    return invList.map((inv, idx) => buildInventorySku(inv, idx, rawSkus, useFlag));
  }
  if (rawSkus.length > 0) {
    return rawSkus.map((entry, idx) => normalizeRawSku(entry, idx, useFlag));
  }
  return undefined;
}

function resolveShippingAndWarranty(formatted: Record<string, unknown>) {
  return {
    packageWeightKg: optNum(formatted.packageWeightKg) ?? SHIPPING_DEFAULTS.packageWeightKg,
    packageLengthCm: optNum(formatted.packageLengthCm),
    packageWidthCm: optNum(formatted.packageWidthCm),
    packageHeightCm: optNum(formatted.packageHeightCm),
    packagingType:
      (optStr(formatted.packagingType) as ShippingPackagingType) ?? SHIPPING_DEFAULTS.packagingType,
    isFragile: typeof formatted.isFragile === 'boolean' ? formatted.isFragile : false,
    hasBatteryOrLiquid:
      typeof formatted.hasBatteryOrLiquid === 'boolean' ? formatted.hasBatteryOrLiquid : false,
    warrantyType:
      (optStr(formatted.warrantyType) as WarrantyType) ?? SHIPPING_DEFAULTS.warrantyType,
    warrantyPeriod: nullStr(formatted.warrantyPeriod),
    warrantyPolicy: nullStr(formatted.warrantyPolicy),
    isNonReturnable:
      typeof formatted.isNonReturnable === 'boolean' ? formatted.isNonReturnable : false,
  };
}

/**
 * Admin detail (add/edit form): elevated consumer that sees everything,
 * including edit helpers (draft mirror, audit fields, skus).
 */
export function formatAdminDetail(formatted: Record<string, unknown>): AdminProductDetail {
  const price = num(formatted.price);
  const colorVariantsRaw = Array.isArray(formatted.colorVariants) ? formatted.colorVariants : [];
  // THE STRIP IS PRESENTATION-ONLY, AND ADMIN IS NOT A PRESENTATION SURFACE.
  //
  // `colorVariants` on the admin detail is an INPUT: the edit form hydrates it
  // and POSTS it straight back. Stripping the leading swatch duplicate here
  // therefore dropped one stored image from the saved gallery every round trip,
  // permanently, with the seller having touched nothing. The strip stays where
  // it belongs — the two storefront shapes (`formatStorefrontCard` /
  // `formatStorefrontDetail`). Admin gets the stored array verbatim; the edit
  // form performs the display strip on hydration and the payload builder puts
  // the removed head back on save, so a save-without-touching-images is
  // byte-identical.
  const colorVariants = colorVariantsRaw.map((entry) => (entry ?? {}) as Record<string, unknown>);
  const mainImagesRaw = cleanStringArray(formatted.mainImages);
  const mainImages = mainImagesRaw.length > 0 ? mainImagesRaw : undefined;

  const rawInventories = formatted.inventories;
  const rawSkus = Array.isArray(formatted.skus)
    ? (formatted.skus as Array<Record<string, unknown>>)
    : [];

  const skus = resolveAdminSkus(rawInventories, rawSkus);
  const shippingAndWarranty = resolveShippingAndWarranty(formatted);

  return {
    id: str(formatted.id),
    name: str(formatted.name),
    slug: optStr(formatted.slug),
    brand: nullStr(formatted.brand),
    brandId: nullStr(formatted.brandId),
    description: optStr(formatted.description),
    price,
    discountedPrice: validDiscount(price, formatted.discountedPrice),
    cover: resolveCover(formatted.mainImages, colorVariantsRaw),
    mainImages,
    sizes: Array.isArray(formatted.sizes) ? formatted.sizes : undefined,
    colorVariants,
    skus,
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
    category: objectOrNull(formatted.category),
    subcategory: objectOrNull(formatted.subcategory),
    reviewNote: nullStr(formatted.reviewNote),
    rejectionReasonCategory: nullStr(formatted.rejectionReasonCategory),
    rejectionSubcategories: Array.isArray(formatted.rejectionSubcategories)
      ? formatted.rejectionSubcategories.filter((s): s is string => typeof s === 'string')
      : undefined,
    rejectionFields: Array.isArray(formatted.rejectionFields)
      ? formatted.rejectionFields.filter((f): f is string => typeof f === 'string')
      : undefined,
    ...shippingAndWarranty,
    createdAt: optDate(formatted.createdAt),
    updatedAt: optDate(formatted.updatedAt),
  };
}
