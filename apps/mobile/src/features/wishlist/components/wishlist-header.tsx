import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { styles } from '../styles/wishlist.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface WishlistHeaderProps {
  topInset: number;
  count: number;
  onBack: () => void;
}

export function WishlistHeader({ topInset, count, onBack }: WishlistHeaderProps) {
  return (
    <View style={[styles.headerBar, { paddingTop: topInset }]}>
      <TouchableOpacity
        style={styles.headerIconSlot}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={24} color={Palette.gray900} />
      </TouchableOpacity>
      <ThemedText style={styles.headerTitle}>
        My Wishlist{count > 0 ? ` (${count})` : ''}
      </ThemedText>
      <View style={styles.headerIconSlot} />
    </View>
  );
}
