import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { OrderView } from '../utils/order-status';
import { formatDate } from '../utils/order-status';

import { OrderCardActions } from './order-card-actions';
import { OrderCardBadge } from './order-card-badge';
import { OrderCardItemView } from './order-card-item-view';

import { ThemedText } from '@/components/themed-text';
import { FontWeight, Palette, Radius } from '@/constants/theme';

interface OrderCardProps {
  order: OrderView;
  onPayNow?: (order: OrderView) => void;
  onCancel?: (order: OrderView) => void;
}

export function OrderCard({ order, onPayNow, onCancel }: OrderCardProps) {
  const totalItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText style={styles.orderMeta} numberOfLines={1}>
          #{order.orderNumber} · {formatDate(order.createdAt)}
        </ThemedText>
        <OrderCardBadge status={order.status} paymentStatus={order.paymentStatus} />
      </View>

      <OrderCardItemView items={order.items} />

      <View style={styles.footerRow}>
        <ThemedText style={styles.totalText} numberOfLines={1}>
          Total: Rs. {order.totalAmount.toLocaleString()} ({totalItemCount}{' '}
          {totalItemCount === 1 ? 'item' : 'items'})
        </ThemedText>
        <OrderCardActions order={order} onPayNow={onPayNow} onCancel={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.white,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderMeta: {
    fontSize: 11,
    color: Palette.gray500,
    flex: 1,
    marginRight: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  totalText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
    flexShrink: 1,
  },
});
