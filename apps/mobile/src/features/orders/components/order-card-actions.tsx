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
  const trackable = isActiveOrder(order.status) || order.status === 'DELIVERED';
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
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelPress} activeOpacity={0.7}>
          <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.outlineBtn} onPress={goToDetail} activeOpacity={0.7}>
        <ThemedText style={styles.outlineBtnText}>Details</ThemedText>
      </TouchableOpacity>

      {trackable && !isUnpaid && (
        <TouchableOpacity style={styles.outlineBtn} onPress={goToDetail} activeOpacity={0.7}>
          <ThemedText style={styles.outlineBtnText}>Track</ThemedText>
        </TouchableOpacity>
      )}

      {isUnpaid && onPayNow && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => onPayNow(order)}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.primaryBtnText}>Pay Now</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelBtn: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    color: Palette.danger,
  },
  outlineBtn: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.white,
  },
  outlineBtnText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    color: Palette.gray800,
  },
  primaryBtn: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
});
