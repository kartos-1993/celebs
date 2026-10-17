import { useCallback, useEffect, useRef, useState } from 'react';

import type { Product } from '../types';
import { sizeForColorSwitch } from '../utils/stock';

/**
 * Keeps a variant index inside the current variant list. A refetch that
 * returns fewer variants (delist, merge, publish lock) must not leave the
 * selection dangling on `colorVariants[index] === undefined`.
 */
export function clampColorIndex(index: number, variantCount: number): number {
  if (!Number.isFinite(index) || variantCount <= 0) return 0;
  return Math.min(Math.max(0, Math.trunc(index)), variantCount - 1);
}

function findColorIndex(variants: { name: string }[], colorName?: string): number {
  if (!colorName) return -1;
  const target = colorName.trim().toLowerCase();
  return variants.findIndex((v) => v.name.trim().toLowerCase() === target);
}

export function useProductVariantSelection(
  product: Product | null | undefined,
  initialColorName?: string,
) {
  const [rawColorIndex, setRawColorIndex] = useState(0);
  const [rawSize, setRawSize] = useState('');
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);

  const colorVariants = product?.colorVariants;
  const variantCount = colorVariants?.length ?? 0;
  const productId = product?.id;

  // Preselect the deep-linked color (e.g. from a product card) once per product.
  const appliedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!productId || appliedForRef.current === productId) return;
    appliedForRef.current = productId;
    const idx = findColorIndex(colorVariants ?? [], initialColorName);
    setRawColorIndex(clampColorIndex(idx >= 0 ? idx : 0, variantCount));
    setRawSize('');
  }, [productId, colorVariants, initialColorName, variantCount]);

  // Derived, not stored: a refetch that shrinks the variant list can never leave
  // the selection out of range, and a size the surviving variant can no longer
  // sell is never handed to a consumer.
  const selectedColorIndex = clampColorIndex(rawColorIndex, variantCount);
  const selectedSize = sizeForColorSwitch(rawSize, colorVariants?.[selectedColorIndex]);

  const handleColorChange = useCallback(
    (index: number) => {
      const nextIndex = clampColorIndex(index, variantCount);
      setRawColorIndex(nextIndex);
      // Always revalidate the carried size against the INCOMING variant, even
      // one that tracks no stock: unknown availability must never inherit a size
      // that was picked for a different SKU.
      setRawSize((prev) => sizeForColorSwitch(prev, colorVariants?.[nextIndex]));
    },
    [colorVariants, variantCount],
  );

  return {
    selectedColorIndex,
    setSelectedColorIndex: setRawColorIndex,
    selectedSize,
    setSelectedSize: setRawSize,
    isSizeModalOpen,
    setIsSizeModalOpen,
    handleColorChange,
  };
}
