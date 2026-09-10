import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { OrderView } from '../utils/order-status';
import { isActiveOrder } from '../utils/order-status';

import { ThemedText } from '@/components/themed-text';
import { FontWeight, Palette, Radius } from '@/constants/theme';

interface OrderCardActionsProps {
  order: OrderView;
  onPayNow?: (order: OrderView) => void;
  onCancel?: (order: OrderView) => void;
}

export function OrderCardActions({ order, onPayNow, onCancel }: OrderCardActionsProps) {
  const router = useRouter();
  const isUnpaid = order.paymentStatus === 'PENDING' || order.status === 'PENDING_PAYMENT';
  const isDelivered = order.status === 'DELIVERED';
  const trackable = isActiveOrder(order.status);
  const canCancel =
    order.status === 'PENDING_PAYMENT' || order.status === 'CONFIRMED' || order.status === 'PACKED';

  const goToDetail = () => {
    router.push({ pathname: '/order-detail', params: { orderId: order.id } });
  };

  const handleCancelPress = () => {
    if (!onCancel) return;
    Alert.alert('Cancel Order', `Cancel order #${order.orderNumber}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => onCancel(order) },
    ]);
  };

  return (
    <View style={styles.container}>
      {canCancel && onCancel && (
        <TouchableOpacity
          style={styles.cancelTextBtn}
          onPress={handleCancelPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </TouchableOpacity>
      )}

      {isUnpaid && onPayNow && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => onPayNow(order)}
          activeOpacity={0.85}
        >
          <ThemedText style={styles.primaryBtnText}>Pay Now</ThemedText>
        </TouchableOpacity>
      )}

      {trackable && !isUnpaid && (
        <TouchableOpacity style={styles.outlineBtn} onPress={goToDetail} activeOpacity={0.8}>
          <ThemedText style={styles.outlineBtnText}>Track</ThemedText>
        </TouchableOpacity>
      )}

      {isDelivered && (
        <TouchableOpacity style={styles.outlineBtn} onPress={goToDetail} activeOpacity={0.8}>
          <ThemedText style={styles.outlineBtnText}>Review</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelTextBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
    color: Palette.danger,
  },
  outlineBtn: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.white,
  },
  outlineBtnText: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
    color: Palette.gray800,
  },
  primaryBtn: {
    height: 28,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray900,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
});
