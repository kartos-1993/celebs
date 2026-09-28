import type { HydratedProduct } from '../types';

import { firstRenderableImage, hasRenderableImage } from '@/utils/image';

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
 * Resolves the primary photo source for a deal tile: a colour gallery's first
 * photo when the product has one, otherwise the derived `cover`. Returns
 * `undefined` (never `''`) so the caller can render a neutral tile.
 */
export function tilePhoto(product: HydratedProduct): string | undefined {
  const withPhotos = product.colorVariants?.find((variant) =>
    hasRenderableImage(firstRenderableImage(variant.images)),
  );
  return firstRenderableImage(withPhotos?.images) ?? product.cover?.trim() ?? undefined;
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
