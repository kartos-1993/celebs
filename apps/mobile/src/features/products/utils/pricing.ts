import { validDiscount } from '@celebs/shared-utils';

import type { Product } from '../hooks/use-products';

export interface ResolvedPrice {
  price: number;
  discountedPrice?: number;
  /** Where the figure came from: a declared combo or the product base. */
  source: 'combo' | 'product';
  /**
   * True when `price` is the LOW end of a range rather than a single SKU
   * figure — several matching combos quoted different effective prices (i.e.
   * no size was chosen). Display sites must render "from {price}" instead of
   * quoting the cheapest size as if it were the only price.
   */
  isRange: boolean;
}

export interface ComboPriceEntry {
  options?: Record<string, string>;
  price: number;
  discountedPrice?: number;
  stock?: number;
}

/** Finite non-negative number, or undefined. Tolerates a NULL API price. */
function safeNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** 'Default'/''/whitespace is a nothing-selected state, not a size to match on. */
function normalizeSizeName(sizeName?: string): string | undefined {
  const trimmed = (sizeName ?? '').trim().toLowerCase();
  if (!trimmed || trimmed === 'default' || trimmed === 'standard') return undefined;
  return sizeName;
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

interface CheapestMatch {
  price: number;
  discountedPrice?: number;
  /** How many distinct effective figures the matching entries quoted. */
  distinctPrices: number;
}

/** Lowest effective (discounted) figure among the entries that match. */
function cheapestMatch(
  entries: ComboPriceEntry[],
  colorName?: string,
  sizeName?: string,
): CheapestMatch | null {
  const effectivePrices = new Set<number>();
  let best: { price: number; discountedPrice?: number; effective: number } | null = null;
  for (const entry of entries) {
    if (!matchesSelection(entry, colorName, sizeName)) continue;
    const price = safeNumber(entry.price);
    if (price === undefined || price <= 0) continue;
    const discountedPrice = validDiscount(price, entry.discountedPrice);
    const effective = discountedPrice ?? price;
    effectivePrices.add(effective);
    if (!best || effective < best.effective) best = { price, discountedPrice, effective };
  }
  if (!best) return null;
  return {
    price: best.price,
    discountedPrice: best.discountedPrice,
    distinctPrices: effectivePrices.size,
  };
}

function productBasePrice(product: Product | null | undefined): ResolvedPrice {
  const base = safeNumber(product?.price) ?? 0;
  return {
    price: base,
    discountedPrice: validDiscount(base, product?.discountedPrice),
    source: 'product',
    isRange: false,
  };
}

/**
 * Exact per-combination price from the backend-declared comboPrices.
 * Falls back to the product base figure when nothing matches.
 *
 * With no size chosen several sizes can match, so the returned `price` is the
 * low end of a range (`isRange: true`) whenever the matches disagree and
 * callers must render "from {price}".
 */
export function resolveVariantPrice(
  product: Product | null | undefined,
  colorName?: string,
  sizeName?: string,
): ResolvedPrice {
  const entries = Array.isArray(product?.comboPrices) ? (product?.comboPrices ?? []) : [];
  const best = cheapestMatch(entries, colorName, normalizeSizeName(sizeName));
  if (!best) return productBasePrice(product);
  return {
    price: best.price,
    discountedPrice: best.discountedPrice,
    source: 'combo',
    isRange: best.distinctPrices > 1,
  };
}

/**
 * Card price, SHEIN style: the backend-declared minimum, falling back to
 * the base figure. No client-side SKU math. `minDiscounted` is validated
 * through the shared `validDiscount` like every other display site.
 */
export function resolveMinPrice(product: Product | null | undefined): ResolvedPrice {
  const fallback = productBasePrice(product);
  const minPrice = safeNumber(product?.minPrice);
  if (minPrice === undefined) return fallback;
  return {
    price: minPrice,
    // Never inherit the base discount here: it may not apply to the cheapest
    // SKU, and an above-list minimum must never render as a deal.
    discountedPrice: validDiscount(minPrice, product?.minDiscounted),
    source: 'combo',
    isRange: false,
  };
}
