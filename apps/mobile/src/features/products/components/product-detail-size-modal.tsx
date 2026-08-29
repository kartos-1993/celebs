import React from 'react';

import type { Product } from '../types';
import { isSizeOutOfStockForVariant } from '../utils/stock';

import { SizeRequiredModal } from './size-required-modal';

interface ProductDetailSizeModalProps {
  visible: boolean;
  onClose: () => void;
  product: Product;
  selectedColorIndex: number;
  selectedSize: string;
  onSelectSizeAndConfirm: (size: string) => void;
}

export function ProductDetailSizeModal({
  visible,
  onClose,
  product,
  selectedColorIndex,
  selectedSize,
  onSelectSizeAndConfirm,
}: ProductDetailSizeModalProps) {
  const availableSizes = product.sizes ? product.sizes.map((s) => s.name) : [];
  const variant = product.colorVariants?.[selectedColorIndex];
  const disabledSizes = availableSizes.filter((s) => isSizeOutOfStockForVariant(variant, s));
  const imageUrl = variant?.images?.[0] || product.mainImages?.[0];

  return (
    <SizeRequiredModal
      visible={visible}
      onClose={onClose}
      availableSizes={availableSizes}
      disabledSizes={disabledSizes}
      productName={product.name}
      initialSize={selectedSize}
      imageUrl={imageUrl}
      price={product.price}
      discountedPrice={product.discountedPrice}
      selectedColorName={variant?.name}
      onSelectSizeAndConfirm={onSelectSizeAndConfirm}
    />
  );
}
