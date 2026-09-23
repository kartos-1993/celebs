import { num, optStr, resolveCover, resolvePriceRange, str } from './shared';

export interface StorefrontCardColorVariant {
  name: string;
  images: string[];
}

export interface StorefrontCard extends Record<string, unknown> {
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

/**
 * Grid card answer: galleries for dots/swipe, minimum price, rating —
 * no measurements, skus, or drafts.
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
    brand: optStr(formatted.brand) ?? null,
    cover: resolveCover(formatted.mainImages, colorVariants),
    price,
    discountedPrice:
      typeof formatted.discountedPrice === 'number' ? formatted.discountedPrice : undefined,
    minPrice: range.min,
    minDiscounted,
    ratingAverage:
      typeof formatted.ratingAverage === 'number' ? formatted.ratingAverage : undefined,
    ratingCount: typeof formatted.ratingCount === 'number' ? formatted.ratingCount : undefined,
    inStock: formatted.inStock !== false,
    colorVariants: colorVariants.map((entry) => {
      const variant = (entry ?? {}) as Record<string, unknown>;
      const images = Array.isArray(variant.images)
        ? variant.images.filter(
            (item): item is string => typeof item === 'string' && item.trim().length > 0,
          )
        : [];
      return { name: str(variant.name, 'Variant'), images };
    }),
  };
}
