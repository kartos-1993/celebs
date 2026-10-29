import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Truck } from 'lucide-react-native';

import type { OrderView } from '../utils/order-status';
import { formatDate } from '../utils/order-status';

import { styles } from './order-card.styles';
import { OrderCardActions } from './order-card-actions';
import { OrderCardBadge } from './order-card-badge';
import { OrderCardItemView } from './order-card-item-view';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface OrderCardProps {
  order: OrderView;
  onPayNow?: (order: OrderView) => void;
  onCancel?: (order: OrderView) => void;
}

export function OrderCard({ order, onPayNow, onCancel }: OrderCardProps) {
  const router = useRouter();
  const totalItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const isDelivered = order.status === 'DELIVERED';
  const isInTransit = order.status === 'HANDED_OVER' || order.status === 'OUT_FOR_DELIVERY';
  const showTracking = isDelivered || isInTransit;

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

      {showTracking && (
        <View style={styles.trackingRow}>
          <Truck size={13} color={isDelivered ? Palette.success : Palette.brand} />
          <ThemedText style={styles.trackingText} numberOfLines={1}>
            {isDelivered
              ? 'Package delivered · View timeline'
              : order.status === 'OUT_FOR_DELIVERY'
                ? 'Out for delivery today'
                : `In transit · ${order.courierName || 'Standard Delivery'}`}
          </ThemedText>
          <ChevronRight size={13} color={Palette.gray400} />
        </View>
      )}

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
