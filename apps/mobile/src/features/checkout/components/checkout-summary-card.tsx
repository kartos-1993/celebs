import React from 'react';
import { View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

import { styles } from '../styles/checkout.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { formatPrice } from '@/features/cart/utils/cart-selectors';

interface CheckoutSummaryCardProps {
  itemsSubtotal: number;
  shippingFee: number;
  grandTotal: number;
  freeShippingThreshold: number;
}

export function CheckoutSummaryCard({
  itemsSubtotal,
  shippingFee,
  grandTotal,
  freeShippingThreshold,
}: CheckoutSummaryCardProps) {
  return (
    <>
      <View style={styles.detailsContainer}>
        <View style={styles.summaryRow}>
          <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
          <ThemedText style={styles.summaryValue}>Rs. {formatPrice(itemsSubtotal)}</ThemedText>
        </View>

        <View style={styles.summaryRow}>
          <ThemedText style={styles.summaryLabel}>Delivery</ThemedText>
          {shippingFee === 0 ? (
            <ThemedText style={styles.freeShippingText}>FREE</ThemedText>
          ) : (
            <ThemedText style={styles.summaryValue}>Rs. {formatPrice(shippingFee)}</ThemedText>
          )}
        </View>

        {shippingFee > 0 && (
          <ThemedText style={styles.summaryLabel}>
            Add Rs. {freeShippingThreshold - itemsSubtotal} more for free delivery
          </ThemedText>
        )}

        <View style={styles.divider} />

        <View style={[styles.summaryRow, styles.totalRowGap]}>
          <ThemedText style={styles.totalLabel}>Grand Total</ThemedText>
          <ThemedText style={styles.totalValue}>Rs. {formatPrice(grandTotal)}</ThemedText>
        </View>
      </View>

      <View style={styles.securityRow}>
        <ShieldCheck size={14} color={Palette.success} />
        <ThemedText style={styles.securityText}>
          100% encrypted & authenticated order processing
        </ThemedText>
      </View>
    </>
  );
}
