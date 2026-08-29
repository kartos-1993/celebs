import React from 'react';
import { View } from 'react-native';

import { styles } from '../styles/product.styles';

import { ProductGallery } from './product-gallery';

import { ThemedText } from '@/components/themed-text';

interface ProductDetailGallerySectionProps {
  images: string[];
  productName: string;
  isOutOfStock: boolean;
}

export function ProductDetailGallerySection({
  images,
  productName,
  isOutOfStock,
}: ProductDetailGallerySectionProps) {
  return (
    <View style={styles.galleryWrapper}>
      <View style={isOutOfStock ? styles.galleryOosImage : undefined}>
        <ProductGallery images={images} productName={productName} />
      </View>
      {isOutOfStock && (
        <View style={styles.galleryOosOverlay} pointerEvents="none">
          <View style={styles.galleryOosBadge}>
            <ThemedText style={styles.galleryOosBadgeText}>OUT OF STOCK</ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}
