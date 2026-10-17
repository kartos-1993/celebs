import React from 'react';
import { TouchableOpacity, View } from 'react-native';

import { styles } from './product-variant-selector.styles';

import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast/toast';

export interface SizeBoxItemProps {
  sizeName: string;
  isSelected: boolean;
  quantity: number | null;
  onSelect: () => void;
}

export const SizeBoxItem: React.FC<SizeBoxItemProps> = ({
  sizeName,
  isSelected,
  quantity,
  onSelect,
}) => {
  const isOutOfStock = quantity !== null && quantity <= 0;
  const isLowStock = quantity !== null && quantity > 0 && quantity <= 5;

  return (
    <TouchableOpacity
      style={[
        styles.sizeBox,
        isSelected && styles.sizeBoxSelected,
        isOutOfStock && styles.sizeBoxDisabled,
        isLowStock && !isSelected && styles.sizeBoxLowStock,
      ]}
      onPress={() => {
        if (isOutOfStock) {
          showToast('No stock available', { type: 'error' });
          return;
        }
        onSelect();
      }}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled: isOutOfStock }}
      accessibilityLabel={`Select size ${sizeName}${
        isOutOfStock ? ' — out of stock' : isLowStock ? ` — ${quantity} left` : ''
      }`}
    >
      <View style={styles.sizeBoxInner}>
        <ThemedText
          style={[
            styles.sizeText,
            isSelected && styles.sizeTextSelected,
            isOutOfStock && styles.sizeTextDisabled,
            isLowStock && !isSelected && styles.sizeTextLowStock,
          ]}
        >
          {sizeName}
        </ThemedText>
        {isLowStock && (
          <ThemedText
            style={[styles.sizeLowStockTag, isSelected && styles.sizeLowStockTagSelected]}
          >
            {quantity} left
          </ThemedText>
        )}
      </View>
    </TouchableOpacity>
  );
};
