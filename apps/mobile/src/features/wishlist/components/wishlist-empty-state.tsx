import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Heart } from 'lucide-react-native';

import { styles } from '../styles/wishlist.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface WishlistEmptyStateProps {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onPress: () => void;
  accessibilityLabel: string;
}

export function WishlistEmptyState({
  title,
  subtitle,
  buttonLabel,
  onPress,
  accessibilityLabel,
}: WishlistEmptyStateProps) {
  return (
    <View style={styles.centerBox}>
      <View style={styles.emptyIconCircle}>
        <Heart size={36} color={Palette.gray400} strokeWidth={1.6} />
      </View>
      <ThemedText style={styles.emptyTitle}>{title}</ThemedText>
      <ThemedText style={styles.emptySub}>{subtitle}</ThemedText>
      <TouchableOpacity
        style={styles.shopNowBtn}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <ThemedText style={styles.shopNowBtnText}>{buttonLabel}</ThemedText>
      </TouchableOpacity>
    </View>
  );
}
