import React, { useCallback, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import type { ProductColorVariant } from '../types';
import { isVariantOutOfStock } from '../utils/stock';
import { swatchDotColor, swatchDotImage } from '../utils/swatch';

import { styles } from './product-variant-selector.styles';

import { MobileApparelImage } from '@/components/mobile-apparel-image';
import { showToast } from '@/components/toast/toast';

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
  const rawImage = swatchDotImage(variant) ?? (variant as { image?: string }).image;
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
      {rawImage && !imageFailed ? (
        <MobileApparelImage
          src={rawImage}
          preset="swatch"
          containerStyle={styles.colorThumbnail}
          contentFit="cover"
          alt={`${variant.name} colour`}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={[styles.colorDot, { backgroundColor: swatchDotColor(variant) }]} />
      )}
      {variantOos && (
        <View style={styles.colorChipDisabledOverlay} pointerEvents="none">
          <View style={styles.colorChipDisabledLine} />
        </View>
      )}
    </TouchableOpacity>
  );
};
