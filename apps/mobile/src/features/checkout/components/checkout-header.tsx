import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { styles } from '../styles/checkout.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface CheckoutHeaderProps {
  insetsTop: number;
  itemsCount: number;
  onBack: () => void;
}

export function CheckoutHeader({ insetsTop, itemsCount, onBack }: CheckoutHeaderProps) {
  return (
    <View style={[styles.headerBar, { paddingTop: insetsTop }]}>
      <TouchableOpacity
        style={styles.headerIconSlot}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={24} color={Palette.gray900} />
      </TouchableOpacity>
      <ThemedText style={styles.headerTitle}>Checkout ({itemsCount})</ThemedText>
      <View style={styles.headerIconSlot} />
    </View>
  );
}
