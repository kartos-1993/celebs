import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartItemHydrated } from '@celebs/shared-types';

import { styles } from './quantity-picker-sheet.styles';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const MAX_QUANTITY_OPTIONS = 10;

interface QuantityPickerSheetProps {
  item: CartItemHydrated | null;
  visible: boolean;
  onClose: () => void;
  onSelect: (quantity: number) => void;
}

export function QuantityPickerSheet({ item, visible, onClose, onSelect }: QuantityPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const [lastItem, setLastItem] = useState<CartItemHydrated | null>(item);

  useEffect(() => {
    if (item) setLastItem(item);
  }, [item]);

  const data = item ?? lastItem;
  if (!data) return null;

  const maxQuantity = Math.min(MAX_QUANTITY_OPTIONS, Math.max(data.availableStock, 1));
  const options = Array.from({ length: maxQuantity }, (_, index) => index + 1);

  return (
    <BottomSheet
      visible={visible && item !== null}
      onClose={onClose}
      heightRatio={0.4}
      accessibilityLabel="Quantity picker"
    >
      <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <ThemedText style={styles.title}>Quantity</ThemedText>
        <ThemedText style={styles.productName} numberOfLines={1}>
          {data.productName}
        </ThemedText>

        <View style={styles.optionsRow}>
          {options.map((quantity) => {
            const isSelected = quantity === data.quantity;
            return (
              <TouchableOpacity
                key={quantity}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => onSelect(quantity)}
                activeOpacity={0.8}
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Quantity ${quantity}`}
              >
                <ThemedText
                  style={[styles.optionText, isSelected && styles.optionTextSelected]}
                >
                  {quantity}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        <ThemedText style={styles.stockNote}>
          {data.availableStock} available in stock
        </ThemedText>
      </View>
    </BottomSheet>
  );
}
