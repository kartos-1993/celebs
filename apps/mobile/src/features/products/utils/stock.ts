import { buildVariantKey, isPlaceholderVariant } from '@celebs/shared-utils';

import type { Product, ProductColorVariant, ProductSize } from '../hooks/use-products';
import type { ProductVariantOption } from '../types';

export interface ProductResolvableSizes {
  sizes?: ProductSize[];
  variantOptions?: ProductVariantOption[];
  colorVariants?: ProductColorVariant[];
}

/**
 * Placeholder check for a selected size/color value. The shared
 * isPlaceholderVariant covers ''/whitespace/'default'; 'standard' is the
 * legacy color-label fallback for the same nothing-selected state, so the
 * mobile layer treats it as a placeholder too (shared helper cannot be
 * extended from the mobile file list).
 */
export function isPlaceholderSelection(value?: string | null): boolean {
  if (isPlaceholderVariant(value)) return true;
  return (value ?? '').trim().toLowerCase() === 'standard';
}

/** Trim/case-insensitive size equality via the shared canonical key. */
function sameSize(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const keyA = buildVariantKey([a]);
  if (!keyA) return false;
  return keyA === buildVariantKey([b]);
}

/**
 * Resolves available product sizes using a unified fallback hierarchy:
 * 1. Explicit measurement sizes (`product.sizes`)
 * 2. Variant option definitions (`product.variantOptions.find(name === 'Size').values`)
 * 3. PostgreSQL inventory stocks (`colorVariants[...].stocks`) — single source of truth
 *
 * Sentinel values ('Default' via the shared placeholder helper) are stripped
 * at every tier so the grid never renders a placeholder chip.
 * When a color index is given, scope strictly to that variant (OOB/empty
 * resolves to []); without an index, union across variants.
 */
export function resolveProductSizes(
  product: ProductResolvableSizes | null | undefined,
  selectedColorIndex?: number,
): ProductSize[] {
  if (!product) return [];

  // 1. Explicit sizes (measurements)
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    const filtered = product.sizes.filter((s) => !isPlaceholderVariant(s.name));
    if (filtered.length > 0) return filtered;
  }

  // 2. Variant options (Size)
  const sizeOption = product.variantOptions?.find((opt) => opt.name.toLowerCase() === 'size');
  if (sizeOption && Array.isArray(sizeOption.values) && sizeOption.values.length > 0) {
    const filtered = sizeOption.values
      .filter((v) => !isPlaceholderVariant(v))
      .map((val) => ({ name: val }));
    if (filtered.length > 0) return filtered;
  }

  // 3. Variant stocks from PostgreSQL ProductInventory
  const variants = product.colorVariants || [];

  return typeof selectedColorIndex === 'number'
    ? scopedStockSizes(variants, selectedColorIndex)
    : unionStockSizes(variants);
}

/** Tier 3: the size names declared by the tracked inventory of ONE variant. */
function scopedStockSizes(
  variants: ProductColorVariant[],
  selectedColorIndex: number,
): ProductSize[] {
  const variant = variants[selectedColorIndex];
  if (!variant?.stocks) return [];
  const scoped = new Set<string>();
  for (const stock of variant.stocks) {
    if (stock.size && !isPlaceholderVariant(stock.size)) scoped.add(stock.size);
  }
  return Array.from(scoped).map((name) => ({ name }));
}

/** Tier 3 without an index: the union of every variant's tracked sizes. */
function unionStockSizes(variants: ProductColorVariant[]): ProductSize[] {
  const stockSizes = new Set<string>();
  for (const variant of variants) {
    for (const stock of variant.stocks ?? []) {
      if (stock.size && !isPlaceholderVariant(stock.size)) stockSizes.add(stock.size);
    }
  }
  return Array.from(stockSizes).map((name) => ({ name }));
}

/**
 * Fail-closed stock check: a missing variant or a variant with no tracked
 * stocks reports OUT OF STOCK (unknown availability must never render as
 * buyable).
 */
export function isVariantOutOfStock(variant: ProductColorVariant | undefined): boolean {
  if (!variant) return true;
  if (!Array.isArray(variant.stocks) || variant.stocks.length === 0) return true;
  return variant.stocks.every((s) => (s.quantity ?? 0) <= 0);
}

export function isProductFullyOutOfStock(product: Product | null | undefined): boolean {
  if (!product) return false;
  const prodRec = product as Product & Record<string, unknown>;

  // Check explicit status flags
  if (prodRec.status === 'out_of_stock' || prodRec.status === 'OUT_OF_STOCK') {
    return true;
  }
  if (prodRec.inStock === false || prodRec.isAvailable === false) {
    return true;
  }
  const totalStock = prodRec.totalStock ?? prodRec.stock;
  if (typeof totalStock === 'number' && totalStock <= 0) {
    return true;
  }

  const variants = product.colorVariants;
  if (!Array.isArray(variants) || variants.length === 0) return true;

  return variants.every(isVariantOutOfStock);
}

export function getStockQtyForVariantSize(
  variant: ProductColorVariant | undefined,
  sizeName: string,
): number | null {
  if (!variant || !Array.isArray(variant.stocks) || variant.stocks.length === 0) return null;
  const entry = variant.stocks.find((s) => sameSize(s.size, sizeName));
  return entry ? (entry.quantity ?? 0) : null;
}

/**
 * Fail-closed per-size check: untracked variants and unknown sizes report
 * OUT OF STOCK so callers never proceed as in-stock on missing data.
 */
export function isSizeOutOfStockForVariant(
  variant: ProductColorVariant | undefined,
  sizeName: string,
): boolean {
  if (!variant || !Array.isArray(variant.stocks) || variant.stocks.length === 0) return true;
  const entry = variant.stocks.find((s) => sameSize(s.size, sizeName));
  if (!entry) return true;
  return (entry.quantity ?? 0) <= 0;
}

export function isSelectedCombinationOutOfStock(
  product: Product | null | undefined,
  selectedColorIndex: number,
  selectedSize: string,
): boolean {
  if (!product) return false;
  const variant = product.colorVariants?.[selectedColorIndex];
  if (!variant) return true;
  if (!selectedSize || isPlaceholderSelection(selectedSize)) {
    return isVariantOutOfStock(variant);
  }
  return isSizeOutOfStockForVariant(variant, selectedSize);
}

/**
 * The size a color switch may carry over, or '' when the incoming variant
 * cannot sell it.
 *
 * Always revalidates — including for a variant that tracks no stock at all
 * (unknown availability must never inherit a size chosen for a different SKU).
 */
export function sizeForColorSwitch(
  selectedSize: string,
  variant: ProductColorVariant | undefined,
): string {
  if (!selectedSize || isPlaceholderSelection(selectedSize)) return '';
  return isSizeOutOfStockForVariant(variant, selectedSize) ? '' : selectedSize;
}

export type CartAddPlan =
  | { kind: 'out-of-stock' }
  | { kind: 'pick-size' }
  | { kind: 'unresolved' }
  | { kind: 'add'; size: string; color: string };

interface PlanCartAddParams {
  product: Product;
  variantIndex: number;
  requestedSize: string;
  isFullyOutOfStock: boolean;
}

/**
 * Decides what an add-to-cart should do, judged on the FRESH product copy.
 *
 * Never fabricates a color/size sentinel: both must come from the variant
 * itself. A sizeless product still has to send a token, and the backend's own
 * `default` value is read back verbatim rather than invented here; a variant
 * that resolves to nothing blocks instead of guessing.
 */
export function planCartAdd({
  product,
  variantIndex,
  requestedSize,
  isFullyOutOfStock,
}: PlanCartAddParams): CartAddPlan {
  const variant = product.colorVariants?.[variantIndex];
  // A legacy 'Standard'/'Default' selection is a nothing-picked state, not a
  // real size — filtered with the shared placeholder helper at submit time.
  const finalSize = isPlaceholderSelection(requestedSize) ? '' : requestedSize;

  // With no size picked, judge the selected variant itself instead of defaulting
  // to "in stock" and leaving the size modal as the only guard.
  const isOos = finalSize
    ? isSizeOutOfStockForVariant(variant, finalSize)
    : isVariantOutOfStock(variant);
  if (isFullyOutOfStock || isOos) return { kind: 'out-of-stock' };

  if (resolveProductSizes(product, variantIndex).length > 0 && !finalSize) {
    return { kind: 'pick-size' };
  }

  const size = finalSize || variant?.stocks?.find((s) => s.size?.trim())?.size || '';
  const color = variant?.name || '';
  if (!size || !color) return { kind: 'unresolved' };
  return { kind: 'add', size, color };
}
