import type { HydratedProduct } from '../types';

/**
 * Calculates human-readable discount percentage tag (e.g. "25% OFF").
 * Returns null if product does not have an active discount.
 */
export function dealTag(product: HydratedProduct): string | null {
  const price = Number(product.price ?? 0);
  const sale = product as HydratedProduct & { discountedPrice?: number | null };
  const discounted = sale.discountedPrice != null ? Number(sale.discountedPrice) : NaN;
  if (Number.isFinite(discounted) && discounted > 0 && discounted < price && price > 0) {
    return `${Math.round((1 - discounted / price) * 100)}% OFF`;
  }
  return null;
}

/**
 * Resolves the primary photo URI for a deal tile, preferring first variant image.
 */
export function tilePhoto(product: HydratedProduct): string {
  const firstVariantPhoto = product.colorVariants?.find(
    (v) => Array.isArray(v.images) && v.images.length > 0,
  )?.images?.[0];
  return firstVariantPhoto ?? product.mainImages?.[0] ?? '';
}

/**
 * Formats the effective display price for a deal tile.
 */
export function tilePrice(product: HydratedProduct): string {
  const sale = product as HydratedProduct & { discountedPrice?: number | null };
  const discounted = sale.discountedPrice != null ? Number(sale.discountedPrice) : NaN;
  const price = Number(product.price ?? 0);
  const effective = Number.isFinite(discounted) && discounted > 0 ? discounted : price;
  return `$${effective.toFixed(2)}`;
}
