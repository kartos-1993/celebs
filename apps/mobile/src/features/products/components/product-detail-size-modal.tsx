import React, { useMemo } from 'react';

import type { Product } from '../types';
import { resolveVariantPrice } from '../utils/pricing';
import { isSizeOutOfStockForVariant, resolveProductSizes } from '../utils/stock';

import { SizeRequiredModal } from './size-required-modal';

import { firstRenderableImage } from '@/utils/image';

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
  const availableSizes = useMemo(
    () => resolveProductSizes(product, selectedColorIndex).map((s) => s.name),
    [product, selectedColorIndex],
  );
  const variant = product.colorVariants?.[selectedColorIndex];
  const disabledSizes = availableSizes.filter((s) => isSizeOutOfStockForVariant(variant, s));
  // Selected colour's own photo first, then the derived `cover`. `mainImages`
  // is not part of the storefront payload and must not be consulted.
  const imageUrl = firstRenderableImage(variant?.images) ?? product.cover?.trim();

  // Price the sheet for the selected COLOR, not the product base: the base
  // figure belongs to whatever SKU happens to be cheapest and would quote a
  // price the shopper cannot buy. With no size chosen this is the low end of
  // the per-color range.
  const { price, discountedPrice } = useMemo(
    () => resolveVariantPrice(product, variant?.name),
    [product, variant?.name],
  );

  return (
    <SizeRequiredModal
      visible={visible}
      onClose={onClose}
      availableSizes={availableSizes}
      disabledSizes={disabledSizes}
      productName={product.name}
      initialSize={selectedSize}
      imageUrl={imageUrl}
      price={price}
      discountedPrice={discountedPrice}
      selectedColorName={variant?.name}
      onSelectSizeAndConfirm={onSelectSizeAndConfirm}
    />
  );
}
