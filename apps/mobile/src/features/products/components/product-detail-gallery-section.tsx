import React from 'react';
import { View } from 'react-native';

import { styles } from '../styles/product.styles';

import { ProductGallery } from './product-gallery';

import { ThemedText } from '@/components/themed-text';

interface ProductDetailGallerySectionProps {
  images: string[];
  productName: string;
  /**
   * Product-wide: no variant is buyable at all.
   */
  isFullyOutOfStock: boolean;
  /**
   * Size-scoped: the currently selected size is depleted. Flagged separately
   * so a single dead size does not dim the whole gallery — the size grid and
   * the bottom bar already say it is unavailable.
   */
  isSelectedSizeOutOfStock: boolean;
}

export function ProductDetailGallerySection({
  images,
  productName,
  isFullyOutOfStock,
  isSelectedSizeOutOfStock,
}: ProductDetailGallerySectionProps) {
  const showOverlay = isFullyOutOfStock || isSelectedSizeOutOfStock;

  return (
    <View style={styles.galleryWrapper}>
      <View style={isFullyOutOfStock ? styles.galleryOosImage : undefined}>
        <ProductGallery images={images} productName={productName} />
      </View>
      {showOverlay && (
        <View style={styles.galleryOosOverlay} pointerEvents="none">
          <View style={styles.galleryOosBadge}>
            <ThemedText style={styles.galleryOosBadgeText}>OUT OF STOCK</ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}
