import {
  num,
  optStr,
  resolveComboPrices,
  resolveCover,
  resolveDisplaySizes,
  resolvePriceRange,
  type SkuPriceEntry,
  str,
  stripSwatchDupe,
} from './shared';

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

export interface StorefrontDetail extends Record<string, unknown> {
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

/**
 * Full PDP answer: every display figure declared, nothing to deduce.
 * Draft mirrors and duplicated swatches are stripped — never served.
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
  const ratingAverage =
    typeof formatted.ratingAverage === 'number' ? formatted.ratingAverage : undefined;
  const ratingCount = typeof formatted.ratingCount === 'number' ? formatted.ratingCount : undefined;
  return {
    id: str(formatted.id),
    name: str(formatted.name),
    brand: optStr(formatted.brand) ?? null,
    description: str(formatted.description),
    price,
    discountedPrice:
      typeof formatted.discountedPrice === 'number' ? formatted.discountedPrice : undefined,
    cover: resolveCover(formatted.mainImages, colorVariants),
    sizes: resolveDisplaySizes(formatted.sizes, colorVariants),
    colorVariants,
    comboPrices,
    priceRange: range,
    minDiscounted,
    ratingAverage,
    ratingCount,
    inStock: formatted.inStock !== false,
    category: formatted.category ?? formatted.categoryId ?? null,
    subcategory: formatted.subcategory ?? formatted.subcategoryId ?? null,
    status: optStr(formatted.status) ?? null,
    vendorId: optStr(formatted.vendorId) ?? null,
  };
}
