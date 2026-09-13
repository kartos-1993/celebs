import React from 'react';
import { GestureResponderEvent, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

import { resolveImageUrl } from '../hooks/use-products';
import type { ProductColorVariant } from '../types';

import { styles } from './product-card.styles';

import { ThemedText } from '@/components/themed-text';

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
        // Canonical dot source: explicit swatch, else first gallery photo.
        const dotImage = variant.swatch ?? variant.images?.[0];
        return (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.8}
            onPress={(e) => onSelectColor(idx, e)}
            style={[
              styles.capsuleColorDot,
              !dotImage && { backgroundColor: variant.colorCode || '#8e8e93' },
              selectedColorIndex === idx && styles.capsuleColorDotActive,
            ]}
          >
            {dotImage ? (
              <Image
                source={{ uri: resolveImageUrl(dotImage) }}
                style={styles.capsuleSwatchImage}
                contentFit="cover"
                transition={100}
                cachePolicy="memory-disk"
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
