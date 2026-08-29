import { useState } from 'react';

import type { Product } from '../types';

export function useProductVariantSelection(product: Product | null | undefined) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);

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
