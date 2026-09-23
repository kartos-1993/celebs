import type { Product } from '../hooks/use-products';

export interface ResolvedPrice {
  price: number;
  discountedPrice?: number;
  /** Where the figure came from: a declared combo or the product base. */
  source: 'combo' | 'product';
}

export interface ComboPriceEntry {
  options?: Record<string, string>;
  price: number;
  discountedPrice?: number;
  stock?: number;
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

function matchesSelection(entry: ComboPriceEntry, colorName?: string, sizeName?: string): boolean {
  const same = (a?: string, b?: string) =>
    a !== undefined && b !== undefined && a.trim().toLowerCase() === b.trim().toLowerCase();
  if (colorName !== undefined) {
    if (!same(optionValue(entry.options, /colou?r/i), colorName)) return false;
  }
  if (sizeName !== undefined) {
    if (!same(optionValue(entry.options, /size/i), sizeName)) return false;
  }
  return true;
}

/**
 * Exact per-combination price from the backend-declared comboPrices.
 * Falls back to the product base figure when nothing matches.
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
  const entries = Array.isArray(product?.comboPrices) ? (product?.comboPrices ?? []) : [];
  let best: { price: number; discountedPrice?: number; effective: number } | null = null;
  for (const entry of entries) {
    if (!matchesSelection(entry, colorName, sizeName)) continue;
    const price = Number(entry.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const deal = validDiscount(price, entry.discountedPrice) ?? price;
    if (!best || deal < best.effective)
      best = {
        price,
        discountedPrice: validDiscount(price, entry.discountedPrice),
        effective: deal,
      };
  }
  if (!best) return fallback;
  return { price: best.price, discountedPrice: best.discountedPrice, source: 'combo' };
}

/**
 * Card price, SHEIN style: the backend-declared minimum, falling back to
 * the base figure. No client-side SKU math.
 */
export function resolveMinPrice(product: Product | null | undefined): ResolvedPrice {
  const base = Number(product?.price ?? 0);
  const fallback: ResolvedPrice = {
    price: Number.isFinite(base) ? base : 0,
    discountedPrice: validDiscount(base, product?.discountedPrice),
    source: 'product',
  };
  if (typeof product?.minPrice === 'number' && Number.isFinite(product.minPrice)) {
    return {
      price: product.minPrice,
      discountedPrice:
        typeof product?.minDiscounted === 'number'
          ? product.minDiscounted
          : fallback.discountedPrice,
      source: 'combo',
    };
  }
  return fallback;
}
