import React from 'react';
import { Pressable, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';

import { styles } from './delivery-location-picker.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface DeliveryLocationItemProps {
  name: string;
  hint?: string | null;
  isSelected: boolean;
  showCheck?: boolean;
  onPress: () => void;
}

export const DeliveryLocationItem = React.memo(function DeliveryLocationItem({
  name,
  hint,
  isSelected,
  showCheck = false,
  onPress,
}: DeliveryLocationItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={name}
      onPress={onPress}
      style={[styles.itemRow, isSelected && styles.itemRowActive]}
    >
      <View style={styles.itemTextContainer}>
        <ThemedText style={styles.itemName}>{name}</ThemedText>
        {hint ? <ThemedText style={styles.itemHint}>{hint}</ThemedText> : null}
      </View>
      {showCheck && isSelected ? (
        <Check size={16} color={Palette.success} />
      ) : (
        <ChevronRight size={16} color={Palette.gray400} />
      )}
    </Pressable>
  );
});
