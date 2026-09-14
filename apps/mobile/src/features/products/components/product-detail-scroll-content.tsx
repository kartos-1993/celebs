import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { styles } from '../styles/product.styles';
import type { Product } from '../types';

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
}: ProductDetailScrollContentProps) {
  const [isReviewsSheetOpen, setIsReviewsSheetOpen] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <ProductDetailGallerySection
        images={galleryImages}
        productName={product.name}
        isOutOfStock={isOutOfStock}
      />

      <ProductPriceCard
        productId={product.id}
        name={product.name}
        price={product.price}
        discountedPrice={product.discountedPrice}
        onOpenReviews={() => setIsReviewsSheetOpen(true)}
      />

      <View style={styles.sectionBand} />

      <View style={styles.detailsContainer}>
        <ProductVariantSelector
          colorVariants={product.colorVariants}
          selectedColorIndex={selectedColorIndex}
          onSelectColor={onSelectColor}
          sizes={product.sizes}
          selectedSize={selectedSize}
          onSelectSize={onSelectSize}
        />
      </View>

      <View style={styles.sectionBand} />
      <ProductServicesCard />
      <ProductReviewsCard
        productId={product.id}
        isSheetOpen={isReviewsSheetOpen}
        onOpenSheet={() => setIsReviewsSheetOpen(true)}
        onCloseSheet={() => setIsReviewsSheetOpen(false)}
        onBuyTheSame={(variant) => {
          if (variant.color && product.colorVariants) {
            const colorIdx = product.colorVariants.findIndex(
              (c) => c.name.toLowerCase() === variant.color?.toLowerCase(),
            );
            if (colorIdx >= 0) onSelectColor(colorIdx);
          }
          if (variant.size) {
            onSelectSize(variant.size);
          }
        }}
        onAddToCart={(item) => {
          if (item.colorVariantName && product.colorVariants) {
            const colorIdx = product.colorVariants.findIndex(
              (c) => c.name.toLowerCase() === item.colorVariantName?.toLowerCase(),
            );
            if (colorIdx >= 0) onSelectColor(colorIdx);
          }
          if (item.size) {
            onSelectSize(item.size);
          }
          onAddToCart?.();
        }}
      />
      <ProductDescriptionCard description={product.description} />
    </ScrollView>
  );
}
