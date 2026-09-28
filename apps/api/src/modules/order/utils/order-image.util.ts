import { resolveCover } from '../../product/utils/product-image.util';

/**
 * Resolves the product image an order email / order confirmation renders.
 *
 * DELEGATES to the single canonical cover resolver
 * (`product/utils/product-image.util.resolveCover`) instead of re-deriving an
 * ordering here:
 *
 *   cover = mainImages[0] ?? first-colour-gallery-image
 *
 * This used to prefer the SELECTED COLOUR's gallery over `mainImages[0]` — the
 * exact inverse of the canonical rule — so any product carrying a shared cover
 * shipped a different picture in the customer's order email and confirmation
 * than the one the storefront card, PDP, and admin list showed. Delegating
 * rather than mirroring is deliberate: a mirrored copy is a second ordering
 * that can drift again, which is the defect this replaces.
 *
 * `colorVariantName` is still part of the accepted item shape because callers
 * (`order/core/order.repository.ts`) pass whole Prisma rows; it no longer
 * influences the answer, since the cover is a PRODUCT-level rendering.
 */
export function resolveOrderItemImageUrl(item: {
  colorVariantName?: string | null;
  inventory?: {
    colorVariantName?: string | null;
    product?: {
      mainImages?: string[];
      colorVariants?: unknown;
    } | null;
  } | null;
}): string | null {
  const product = item.inventory?.product;
  if (!product) return null;

  return resolveCover(product.mainImages, product.colorVariants) ?? null;
}
