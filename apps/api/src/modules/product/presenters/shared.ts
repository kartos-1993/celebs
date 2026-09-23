/**
 * Shared display derivations: every response shape reads these helpers, so
 * admin rows, cards, and PDP can never disagree on price, cover, or stock.
 * Screens render declared fields; they must not recompute them.
 */

export interface SkuPriceEntry {
  options: Record<string, string>;
  price: number;
  discountedPrice?: number;
  stock: number;
}

export interface PriceRange {
  min: number;
  max: number;
  minDiscounted?: number;
}

function toPositiveNumber(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

/** Coercions: DB rows arrive loosely typed; shapes leave strictly typed. */
export function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value ? value : fallback;
}

export function optStr(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

export function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validDiscount(price: number, discounted: unknown): number | undefined {
  const value = Number(discounted);
  if (Number.isFinite(value) && value > 0 && value < price) return value;
  return undefined;
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

/** Exact per-combination prices from skus[]. Empty when none usable. */
export function resolveComboPrices(skus: unknown): SkuPriceEntry[] {
  return asSkuList(skus);
}

/** Floor/ceiling across combos, falling back to the base pair. */
export function resolvePriceRange(
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

/** Single cover URL: explicit mains win, else first gallery image. */
export function resolveCover(mainImages: unknown, colorVariants: unknown): string | undefined {
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

/** Total on-hand stock across skus (0 when none tracked). */
export function resolveStockTotal(skus: unknown): number {
  return asSkuList(skus).reduce((sum, sku) => sum + sku.stock, 0);
}

/** Strips a swatch URL duplicated as the gallery's first image. */
export function stripSwatchDupe(images: unknown, swatch: unknown): string[] {
  if (!Array.isArray(images)) return [];
  const list = images.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0,
  );
  if (typeof swatch === 'string' && swatch && list[0] === swatch) {
    return list.slice(1);
  }
  return list;
}

/**
 * Display sizes with measurements when present; otherwise the union of
 * tracked stock sizes so no screen can blank while sizing data exists.
 */
export function resolveDisplaySizes(
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
