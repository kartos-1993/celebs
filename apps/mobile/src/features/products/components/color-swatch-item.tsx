import React, { useCallback, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

import type { ProductColorVariant } from '../types';
import { isVariantOutOfStock } from '../utils/stock';

import { styles } from './product-variant-selector.styles';

import { showToast } from '@/components/toast/toast';
import { resolveImageUrl } from '@/constants/config';
import { Palette } from '@/constants/theme';

export interface ColorSwatchItemProps {
  variant: ProductColorVariant;
  isSelected: boolean;
  /** Stable identity so the press handler does not need a per-render closure. */
  variantIndex: number;
  onSelectColor: (index: number) => void;
}

export const ColorSwatchItem: React.FC<ColorSwatchItemProps> = ({
  variant,
  isSelected,
  variantIndex,
  onSelectColor,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const rawImage =
    (variant as { swatch?: string }).swatch ||
    variant.images?.[0] ||
    (variant as { image?: string }).image;
  const imageUrl = rawImage ? resolveImageUrl(rawImage) : null;
  const variantOos = isVariantOutOfStock(variant);

  const handlePress = useCallback(() => {
    // An out-of-stock color is not selectable — same contract (and same toast)
    // as the size boxes, so tapping explains itself instead of doing nothing.
    if (variantOos) {
      showToast('No stock available', { type: 'error' });
      return;
    }
    onSelectColor(variantIndex);
  }, [onSelectColor, variantIndex, variantOos]);

  return (
    <TouchableOpacity
      style={[
        styles.colorChip,
        isSelected && styles.colorChipSelected,
        variantOos && styles.colorChipDisabled,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled: variantOos }}
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
        <View style={[styles.colorDot, { backgroundColor: variant.colorCode || Palette.black }]} />
      )}
      {variantOos && (
        <View style={styles.colorChipDisabledOverlay} pointerEvents="none">
          <View style={styles.colorChipDisabledLine} />
        </View>
      )}
    </TouchableOpacity>
  );
};
