import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

import type { ProductColorVariant } from '../types';
import { isVariantOutOfStock } from '../utils/stock';

import { styles } from './product-variant-selector.styles';

import { resolveImageUrl } from '@/constants/config';

export interface ColorSwatchItemProps {
  variant: ProductColorVariant;
  isSelected: boolean;
  onSelect: () => void;
}

export const ColorSwatchItem: React.FC<ColorSwatchItemProps> = ({
  variant,
  isSelected,
  onSelect,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const rawImage =
    (variant as { swatch?: string }).swatch ||
    variant.images?.[0] ||
    (variant as { image?: string }).image;
  const imageUrl = rawImage ? resolveImageUrl(rawImage) : null;
  const variantOos = isVariantOutOfStock(variant);

  return (
    <TouchableOpacity
      style={[
        styles.colorChip,
        isSelected && styles.colorChipSelected,
        variantOos && styles.colorChipDisabled,
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`Select color ${variant.name}${variantOos ? ' — out of stock' : ''}`}
    >
      {imageUrl && !imageFailed ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.colorThumbnail}
          contentFit="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={[styles.colorDot, { backgroundColor: variant.colorCode || '#000000' }]} />
      )}
      {variantOos && (
        <View style={styles.colorChipDisabledOverlay} pointerEvents="none">
          <View style={styles.colorChipDisabledLine} />
        </View>
      )}
    </TouchableOpacity>
  );
};
