import React from 'react';
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
}

export function ProductDetailScrollContent({
  product,
  galleryImages,
  isOutOfStock,
  selectedColorIndex,
  selectedSize,
  onSelectColor,
  onSelectSize,
}: ProductDetailScrollContentProps) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <ProductDetailGallerySection
        images={galleryImages}
        productName={product.name}
        isOutOfStock={isOutOfStock}
      />

      <ProductPriceCard
        name={product.name}
        price={product.price}
        discountedPrice={product.discountedPrice}
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
      <View style={styles.sectionBand} />
      <ProductReviewsCard />
      <ProductDescriptionCard description={product.description} />
    </ScrollView>
  );
}
