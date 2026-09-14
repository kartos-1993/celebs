import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

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
  const router = useRouter();
  const totalItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const handlePressCard = () => {
    router.push({ pathname: '/order-detail', params: { orderId: order.id } });
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={handlePressCard}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <ThemedText style={styles.orderNumber}>#{order.orderNumber}</ThemedText>
          <ThemedText style={styles.orderDate}>· {formatDate(order.createdAt)}</ThemedText>
        </View>
        <OrderCardBadge
          status={order.status}
          paymentStatus={order.paymentStatus}
          paymentMethod={order.paymentMethod}
        />
      </View>

      <View style={styles.divider} />

      <OrderCardItemView items={order.items} />

      <View style={styles.footerRow}>
        <ThemedText style={styles.totalLabel} numberOfLines={1}>
          Total:{' '}
          <ThemedText style={styles.totalAmount}>
            Rs. {order.totalAmount.toLocaleString()}
          </ThemedText>
          <ThemedText style={styles.itemCount}>
            {' '}
            ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})
          </ThemedText>
        </ThemedText>
        <OrderCardActions order={order} onPayNow={onPayNow} onCancel={onCancel} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.white,
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  orderDate: {
    fontSize: 11,
    color: Palette.gray400,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F8FAFC',
    marginVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F8FAFC',
  },
  totalLabel: {
    fontSize: 12,
    color: Palette.gray600,
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: FontWeight.black,
    color: Palette.gray900,
  },
  itemCount: {
    fontSize: 11,
    color: Palette.gray400,
  },
});
