import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import { styles } from '../styles/checkout.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';
import { formatPrice } from '@/features/cart/utils/cart-selectors';

interface CheckoutBottomBarProps {
  insetsBottom: number;
  deliveryCaption: string;
  grandTotal: number;
  canPlaceOrder: boolean;
  placingOrder: boolean;
  effectiveSelectedId: string | null;
  onPlaceOrder: () => void;
}

export function CheckoutBottomBar({
  insetsBottom,
  deliveryCaption,
  grandTotal,
  canPlaceOrder,
  placingOrder,
  effectiveSelectedId,
  onPlaceOrder,
}: CheckoutBottomBarProps) {
  return (
    <View style={[styles.bottomBar, { paddingBottom: insetsBottom + Spacing.xs }]}>
      <View style={styles.barTotalsGroup}>
        <ThemedText style={styles.barCaption}>{deliveryCaption}</ThemedText>
        <ThemedText style={styles.barTotalPrice}>Rs. {formatPrice(grandTotal)}</ThemedText>
      </View>
      <TouchableOpacity
        style={[styles.placeBtn, (!canPlaceOrder || placingOrder) && styles.placeBtnDisabled]}
        onPress={onPlaceOrder}
        disabled={!canPlaceOrder || placingOrder}
        activeOpacity={0.85}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={
          effectiveSelectedId
            ? `Place order, total Rs. ${formatPrice(grandTotal)}`
            : 'Add a delivery address to place order'
        }
      >
        {placingOrder ? (
          <ActivityIndicator color={Palette.white} />
        ) : (
          <ThemedText style={styles.placeBtnText}>
            Place Order · Rs. {formatPrice(grandTotal)}
          </ThemedText>
        )}
      </TouchableOpacity>
    </View>
  );
}
