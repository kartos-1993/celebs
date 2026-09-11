import React from 'react';
import { View } from 'react-native';

import { styles } from '../styles/order-detail.styles';
import type { OrderView } from '../utils/order-status';

import { ThemedText } from '@/components/themed-text';

interface OrderDetailPricingProps {
  order: OrderView;
  itemsSubtotal: number;
}

export function OrderDetailPricing({ order, itemsSubtotal }: OrderDetailPricingProps) {
  return (
    <>
      <View style={styles.divider} />

      <View style={styles.summaryRow}>
        <ThemedText style={styles.summaryLabel}>Items subtotal</ThemedText>
        <ThemedText style={styles.summaryValue}>Rs. {itemsSubtotal.toLocaleString()}</ThemedText>
      </View>
      <View style={styles.summaryRow}>
        <ThemedText style={styles.summaryLabel}>Delivery</ThemedText>
        {order.shippingFee === 0 ? (
          <ThemedText style={styles.freeText}>FREE</ThemedText>
        ) : (
          <ThemedText style={styles.summaryValue}>
            Rs. {order.shippingFee.toLocaleString()}
          </ThemedText>
        )}
      </View>
      {order.discountAmount > 0 ? (
        <View style={styles.summaryRow}>
          <ThemedText style={styles.summaryLabel}>Discount</ThemedText>
          <ThemedText style={styles.discountValue}>
            - Rs. {order.discountAmount.toLocaleString()}
          </ThemedText>
        </View>
      ) : null}
      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <ThemedText style={styles.totalLabel}>
          Grand Total ·{' '}
          {order.paymentMethod === 'COD'
            ? `COD (${order.paymentStatus})`
            : `${order.paymentMethod} (${order.paymentStatus})`}
        </ThemedText>
        <ThemedText style={styles.totalValue}>Rs. {order.totalAmount.toLocaleString()}</ThemedText>
      </View>
    </>
  );
}
