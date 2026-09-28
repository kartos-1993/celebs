import React from 'react';
import { GestureResponderEvent, TouchableOpacity, View } from 'react-native';

import type { ProductColorVariant } from '../types';
import { swatchDotColor, swatchDotImage } from '../utils/swatch';

import { styles } from './product-card.styles';

import { MobileApparelImage } from '@/components/mobile-apparel-image';
import { ThemedText } from '@/components/themed-text';

/** 44pt-min touch target for the small swatch dots. */
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

interface ProductCardSwatchCapsuleProps {
  variants?: ProductColorVariant[] | null;
  selectedColorIndex: number;
  onSelectColor: (idx: number, e?: GestureResponderEvent) => void;
}

export function ProductCardSwatchCapsule({
  variants,
  selectedColorIndex,
  onSelectColor,
}: ProductCardSwatchCapsuleProps) {
  if (!variants || variants.length <= 1) return null;

  return (
    <View style={styles.imageColorCapsule}>
      {variants.slice(0, 4).map((variant, idx) => {
        const dotImage = swatchDotImage(variant);
        return (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.8}
            hitSlop={HIT_SLOP}
            onPress={(e) => onSelectColor(idx, e)}
            accessible={true}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedColorIndex === idx }}
            accessibilityLabel={`Select color ${variant.name}`}
            style={[
              styles.capsuleColorDot,
              !dotImage && { backgroundColor: swatchDotColor(variant) },
              selectedColorIndex === idx && styles.capsuleColorDotActive,
            ]}
          >
            {dotImage ? (
              <MobileApparelImage
                src={dotImage}
                preset="swatch"
                containerStyle={styles.capsuleSwatchImage}
                alt={`${variant.name} swatch`}
              />
            ) : null}
          </TouchableOpacity>
        );
      })}
      {variants.length > 4 && (
        <ThemedText style={styles.capsuleCountText}>+{variants.length - 4}</ThemedText>
      )}
    </View>
  );
}
