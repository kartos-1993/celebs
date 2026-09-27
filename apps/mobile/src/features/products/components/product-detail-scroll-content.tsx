import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { styles } from '../styles/product.styles';
import type { Product } from '../types';
import { resolveVariantPrice } from '../utils/pricing';
import { isProductFullyOutOfStock, isSelectedCombinationOutOfStock } from '../utils/stock';

import { ProductDescriptionCard } from './product-description-card';
import { ProductDetailGallerySection } from './product-detail-gallery-section';
import { ProductPriceCard } from './product-price-card';
import { ProductReviewsCard } from './product-reviews-card';
import { ProductServicesCard } from './product-services-card';
import { ProductVariantSelector } from './product-variant-selector';

interface ProductDetailScrollContentProps {
  product: Product;
  galleryImages: string[];
  isOutOfStock: boolean;
  selectedColorIndex: number;
  selectedSize: string;
  onSelectColor: (index: number) => void;
  onSelectSize: (size: string) => void;
  onAddToCart?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function ProductDetailScrollContent({
  product,
  galleryImages,
  isOutOfStock,
  selectedColorIndex,
  selectedSize,
  onSelectColor,
  onSelectSize,
  onAddToCart,
  refreshing = false,
  onRefresh,
}: ProductDetailScrollContentProps) {
  const [isReviewsSheetOpen, setIsReviewsSheetOpen] = useState(false);

  /**
   * Reviews "add to cart" must not run in the same tick as the selection it
   * just changed: `onAddToCart` closes over the PREVIOUS render's color/size,
   * so calling it inline would ship the stale variant. Bumping a request
   * counter and replaying it from an effect runs it after the re-render, with
   * the fresh selection.
   */
  const [reviewAddRequest, setReviewAddRequest] = useState(0);
  const handledReviewAddRef = useRef(0);
  useEffect(() => {
    if (!reviewAddRequest || handledReviewAddRef.current === reviewAddRequest) return;
    handledReviewAddRef.current = reviewAddRequest;
    onAddToCart?.();
  }, [reviewAddRequest, onAddToCart]);

  const openReviews = useCallback(() => setIsReviewsSheetOpen(true), []);
  const closeReviews = useCallback(() => setIsReviewsSheetOpen(false), []);

  const handleReviewVariant = useCallback(
    (variant: { color?: string | null; size?: string | null }) => {
      if (variant.color && product.colorVariants) {
        const colorIdx = product.colorVariants.findIndex(
          (c) => c.name.toLowerCase() === variant.color?.toLowerCase(),
        );
        if (colorIdx >= 0) onSelectColor(colorIdx);
      }
      if (variant.size) {
        onSelectSize(variant.size);
      }
    },
    [onSelectColor, onSelectSize, product.colorVariants],
  );

  const handleReviewAddToCart = useCallback(
    (item: { colorVariantName?: string | null; size?: string | null }) => {
      handleReviewVariant({ color: item.colorVariantName, size: item.size });
      setReviewAddRequest((prev) => prev + 1);
    },
    [handleReviewVariant],
  );

  // Exact per-combination figure: follows every swatch/size tap, falls
  // back to the product base price when no SKU matches the selection.
  const selectedColorName = product.colorVariants?.[selectedColorIndex]?.name;
  const resolvedPrice = useMemo(
    () => resolveVariantPrice(product, selectedColorName, selectedSize || undefined),
    [product, selectedColorName, selectedSize],
  );

  // The parent already folds "fully OOS OR selected size OOS" into
  // isOutOfStock. Split it so a single depleted size no longer greys out every
  // photo (which blanked the whole gallery).
  const isFullyOutOfStock = isOutOfStock && isProductFullyOutOfStock(product);
  const isSelectedSizeOutOfStock =
    isOutOfStock &&
    !isFullyOutOfStock &&
    isSelectedCombinationOutOfStock(product, selectedColorIndex, selectedSize);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
      }
    >
      <ProductDetailGallerySection
        images={galleryImages}
        productName={product.name}
        isFullyOutOfStock={isFullyOutOfStock}
        isSelectedSizeOutOfStock={isSelectedSizeOutOfStock}
      />

      <ProductPriceCard
        productId={product.id}
        name={product.name}
        price={resolvedPrice.price}
        discountedPrice={resolvedPrice.discountedPrice}
        isRange={resolvedPrice.isRange}
        onOpenReviews={openReviews}
      />

      <View style={styles.sectionBand} />

      <View style={styles.detailsContainer}>
        <ProductVariantSelector
          colorVariants={product.colorVariants}
          selectedColorIndex={selectedColorIndex}
          onSelectColor={onSelectColor}
          sizes={product.sizes}
          variantOptions={product.variantOptions}
          selectedSize={selectedSize}
          onSelectSize={onSelectSize}
        />
      </View>

      <View style={styles.sectionBand} />
      <ProductServicesCard />
      <ProductReviewsCard
        productId={product.id}
        isSheetOpen={isReviewsSheetOpen}
        onOpenSheet={openReviews}
        onCloseSheet={closeReviews}
        onBuyTheSame={handleReviewVariant}
        onAddToCart={handleReviewAddToCart}
      />
      <ProductDescriptionCard description={product.description} />
    </ScrollView>
  );
}
