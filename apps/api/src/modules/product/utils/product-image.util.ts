/**
 * COVER ORDER (canonical contract — client implements the same):
 * cover = mainImages[0] ?? first-color-gallery-image.
 *
 * This is the process-wide single cover resolver. Storefront cards, admin
 * detail, order emails, review tiles and the cart all delegate here instead of
 * re-deriving a precedence that can then drift from the storefront's. A
 * mirrored copy is not an equivalent — the whole point is that there is exactly
 * one ordering.
 *
 * It lives outside the response-shape module because it is not a response
 * shape: it answers "which image represents this product", which cart, order
 * and review each need on its own.
 */
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
