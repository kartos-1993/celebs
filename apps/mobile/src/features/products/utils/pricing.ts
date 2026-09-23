import type { Product, ProductSku } from '../hooks/use-products';

export interface ResolvedPrice {
  price: number;
  discountedPrice?: number;
  /** Where the figure came from: an exact SKU match or the product base. */
  source: 'sku' | 'product';
}

function validDiscount(price: number, discounted: unknown): number | undefined {
  const value = Number(discounted);
  if (Number.isFinite(value) && value > 0 && value < price) return value;
  return undefined;
}

function optionValue(
  options: Record<string, string> | undefined,
  keyPattern: RegExp,
): string | undefined {
  if (!options) return undefined;
  for (const [key, value] of Object.entries(options)) {
    if (keyPattern.test(key)) return String(value ?? '');
  }
  return undefined;
}

function matchesSelection(sku: ProductSku, colorName?: string, sizeName?: string): boolean {
  const same = (a?: string, b?: string) =>
    a !== undefined && b !== undefined && a.trim().toLowerCase() === b.trim().toLowerCase();
  if (colorName !== undefined) {
    const skuColor = optionValue(sku.selectedOptions, /colou?r/i);
    if (!same(skuColor, colorName)) return false;
  }
  if (sizeName !== undefined) {
    const skuSize = optionValue(sku.selectedOptions, /size/i);
    if (!same(skuSize, sizeName)) return false;
  }
  return true;
}

function effectiveOf(sku: ProductSku): { price: number; discountedPrice?: number } | null {
  const price = Number(sku.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  return { price, discountedPrice: validDiscount(price, sku.discountedPrice) };
}

/**
 * Exact per-combination price for a selected color/size, SHEIN PDP style.
 * Falls back to the product base figure when no SKU matches.
 */
export function resolveVariantPrice(
  product: Product | null | undefined,
  colorName?: string,
  sizeName?: string,
): ResolvedPrice {
  const base = Number(product?.price ?? 0);
  const fallback: ResolvedPrice = {
    price: Number.isFinite(base) ? base : 0,
    discountedPrice: validDiscount(base, product?.discountedPrice),
    source: 'product',
  };
  const skus = Array.isArray(product?.skus) ? (product?.skus ?? []) : [];
  let best: { price: number; discountedPrice?: number; effective: number } | null = null;
  for (const sku of skus) {
    if (!matchesSelection(sku, colorName, sizeName)) continue;
    const effective = effectiveOf(sku);
    if (effective) {
      const deal = effective.discountedPrice ?? effective.price;
      if (!best || deal < best.effective) best = { ...effective, effective: deal };
    }
  }
  if (!best) return fallback;
  return { price: best.price, discountedPrice: best.discountedPrice, source: 'sku' };
}

/**
 * Card price, SHEIN style: the minimum across all SKUs (the only honest
 * single number without size context). Falls back to the base figure.
 */
export function resolveMinPrice(product: Product | null | undefined): ResolvedPrice {
  const base = Number(product?.price ?? 0);
  const fallback: ResolvedPrice = {
    price: Number.isFinite(base) ? base : 0,
    discountedPrice: validDiscount(base, product?.discountedPrice),
    source: 'product',
  };
  const skus = Array.isArray(product?.skus) ? (product?.skus ?? []) : [];
  let best: { price: number; discountedPrice?: number; effective: number } | null = null;
  for (const sku of skus) {
    const effective = effectiveOf(sku);
    if (effective) {
      const deal = effective.discountedPrice ?? effective.price;
      if (!best || deal < best.effective) best = { ...effective, effective: deal };
    }
  }
  if (!best) return fallback;
  return { price: best.price, discountedPrice: best.discountedPrice, source: 'sku' };
}
