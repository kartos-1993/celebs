import React from 'react';
import { TouchableOpacity, View } from 'react-native';

import { formatPrice } from '../utils/cart-selectors';

import { styles } from './cart-checkout-bar.styles';
import { CartPrice } from './cart-price';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface CartCheckoutBarProps {
  itemCount: number;
  total: number;
  originalTotal: number;
  disabled?: boolean;
  onCheckout: () => void;
}

export function CartCheckoutBar({
  itemCount,
  total,
  originalTotal,
  disabled = false,
  onCheckout,
}: CartCheckoutBarProps) {
  const savings = Math.max(0, originalTotal - total);

  return (
    <View style={styles.container} pointerEvents={disabled ? 'box-only' : 'auto'}>
      <View style={styles.totalsGroup}>
        <View style={styles.totalRow}>
          <CartPrice value={total} color={Palette.danger} size="lg" />
          {savings > 0 && (
            <ThemedText style={styles.strikeTotal}>Rs. {formatPrice(originalTotal)}</ThemedText>
          )}
        </View>
        {savings > 0 && (
          <View style={styles.savingsRow}>
            <ThemedText style={styles.savingsLabel}>You save</ThemedText>
            <ThemedText style={styles.savingsValue}>Rs. {formatPrice(savings)}</ThemedText>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.checkoutBtn, disabled && styles.checkoutBtnDisabled]}
        onPress={onCheckout}
        disabled={disabled}
        activeOpacity={0.85}
        accessible={true}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={
          itemCount > 0 ? `Checkout ${itemCount} items` : 'Select items to checkout'
        }
      >
        <ThemedText style={styles.checkoutBtnText}>
          {itemCount > 0 ? `Checkout (${itemCount})` : 'Checkout'}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}
