import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';

import { styles } from './combo-bundle-modal.styles';

import { ThemedText } from '@/components/themed-text';

export interface RenderableBundleItem {
  id: string;
  name: string;
  originalPrice: number;
  image: string;
  sizes: string[];
  colors: string[];
}

interface ComboBundleItemCardProps {
  item: RenderableBundleItem;
  selectedSize?: string;
  selectedColor?: string;
  onSelectSize: (itemId: string, size: string) => void;
  onSelectColor: (itemId: string, color: string) => void;
}

export function ComboBundleItemCard({
  item,
  selectedSize,
  selectedColor,
  onSelectSize,
  onSelectColor,
}: ComboBundleItemCardProps) {
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemRow}>
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        <View style={styles.itemInfo}>
          <ThemedText style={styles.itemName}>{item.name}</ThemedText>
          <ThemedText style={styles.itemOriginalPrice}>
            Single Price: NPR {item.originalPrice.toLocaleString()}
          </ThemedText>
        </View>
      </View>

      {/* Size Selector */}
      <View style={styles.selectorGroup}>
        <ThemedText style={styles.selectorLabel}>Size:</ThemedText>
        <View style={styles.optionsRow}>
          {item.sizes.map((s) => {
            const isSelected = selectedSize === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => onSelectSize(item.id, s)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Size ${s}`}
                accessibilityState={{ selected: isSelected }}
              >
                <ThemedText style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {s}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Color Selector */}
      {item.colors.length > 1 && (
        <View style={styles.selectorGroup}>
          <ThemedText style={styles.selectorLabel}>Color:</ThemedText>
          <View style={styles.optionsRow}>
            {item.colors.map((c) => {
              const isSelected = selectedColor === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => onSelectColor(item.id, c)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Color ${c}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <ThemedText style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {c}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
