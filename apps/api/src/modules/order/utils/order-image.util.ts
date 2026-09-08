interface ColorVariantImage {
  name?: string;
  images?: string[];
}

/**
 * Resolves the exact product image matching the selected color variant,
 * gracefully falling back to the product's primary mainImages[0].
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

  const targetColor = item.colorVariantName || item.inventory?.colorVariantName;
  if (targetColor && Array.isArray(product.colorVariants)) {
    const variants = product.colorVariants as ColorVariantImage[];
    const match = variants.find(
      (v) => v.name?.trim().toLowerCase() === targetColor.trim().toLowerCase(),
    );
    if (match?.images && match.images.length > 0 && match.images[0]) {
      return match.images[0];
    }
  }

  if (product.mainImages && product.mainImages.length > 0 && product.mainImages[0]) {
    return product.mainImages[0];
  }

  return null;
}
