import { useEffect, useRef, useState } from 'react';

import type { Product } from '../types';

export function useProductVariantSelection(
  product: Product | null | undefined,
  initialColorName?: string,
) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);

  // Preselect the deep-linked color (e.g. from a product card) once per product.
  const appliedForRef = useRef<string | null>(null);
  const productId = product?.id;
  useEffect(() => {
    if (!productId || appliedForRef.current === productId) return;
    appliedForRef.current = productId;
    const variants = product?.colorVariants ?? [];
    const idx = initialColorName
      ? variants.findIndex((v) => v.name.toLowerCase() === initialColorName.toLowerCase())
      : -1;
    setSelectedColorIndex(idx >= 0 ? idx : 0);
    setSelectedSize('');
  }, [productId, product, initialColorName]);

  const handleColorChange = (index: number) => {
    setSelectedColorIndex(index);
    const newVariant = product?.colorVariants?.[index];
    if (selectedSize && newVariant?.stocks) {
      const stockItem = newVariant.stocks.find(
        (st) => st.size.toLowerCase() === selectedSize.toLowerCase(),
      );
      if (!stockItem || stockItem.quantity <= 0) {
        setSelectedSize('');
      }
    }
  };

  return {
    selectedColorIndex,
    setSelectedColorIndex,
    selectedSize,
    setSelectedSize,
    isSizeModalOpen,
    setIsSizeModalOpen,
    handleColorChange,
  };
}
