import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { BadgePercent, ChevronRight } from 'lucide-react-native';

import { formatPrice } from '../utils/cart-selectors';

import { styles } from './cart-promo-banner.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface CartPromoBannerProps {
  savings: number;
  savingsPercent: number;
  freeShippingRemaining: number | null;
  onAction?: () => void;
}

export function CartPromoBanner({
  savings,
  savingsPercent,
  freeShippingRemaining,
  onAction,
}: CartPromoBannerProps) {
  if (savings > 0) {
    return (
      <View style={styles.banner}>
        <View style={styles.iconCircle}>
          <BadgePercent size={14} color={Palette.white} />
        </View>
        <View style={styles.textWrap}>
          <ThemedText style={styles.textHighlight}>Rs. {formatPrice(savings)}</ThemedText>
          <ThemedText style={styles.textBase}>saved with</ThemedText>
          <ThemedText style={styles.textHighlight}>{savingsPercent}% OFF</ThemedText>
          <ThemedText style={styles.textBase}>on selected items. Checkout now!</ThemedText>
        </View>
      </View>
    );
  }

  if (freeShippingRemaining != null && freeShippingRemaining > 0) {
    return (
      <View style={styles.banner}>
        <View style={styles.iconCircle}>
          <BadgePercent size={14} color={Palette.white} />
        </View>
        <View style={styles.textWrap}>
          <ThemedText style={styles.textHighlight}>
            Rs. {formatPrice(freeShippingRemaining)}
          </ThemedText>
          <ThemedText style={styles.textBase}>more to get</ThemedText>
          <ThemedText style={styles.textHighlight}>FREE delivery</ThemedText>
          <ThemedText style={styles.textBase}>. Add more items to apply!</ThemedText>
        </View>
        {onAction ? (
          <TouchableOpacity
            style={styles.action}
            onPress={onAction}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Add more items"
          >
            <ThemedText style={styles.actionText}>Add</ThemedText>
            <ChevronRight size={14} color={Palette.gray900} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return null;
}
