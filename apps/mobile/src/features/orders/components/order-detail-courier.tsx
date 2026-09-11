import React from 'react';
import { Linking, TouchableOpacity, View } from 'react-native';
import { ExternalLink, Truck } from 'lucide-react-native';

import { styles } from '../styles/order-detail.styles';
import type { OrderView } from '../utils/order-status';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface OrderDetailCourierProps {
  order: OrderView;
}

export function OrderDetailCourier({ order }: OrderDetailCourierProps) {
  if (!order.courierName && !order.trackingNumber) {
    return null;
  }

  const handleOpenCourier = () => {
    if (!order.trackingUrl) return;
    Linking.openURL(order.trackingUrl).catch(() => undefined);
  };

  return (
    <View style={styles.courierCard}>
      <Truck size={16} color={Palette.gray800} />
      <View style={styles.courierInfo}>
        <ThemedText style={styles.courierName}>
          {order.courierName || order.courierProvider || 'Courier'}
        </ThemedText>
        {!!order.trackingNumber && (
          <ThemedText style={styles.courierWaybill}>Waybill {order.trackingNumber}</ThemedText>
        )}
      </View>
      {!!order.trackingUrl && (
        <TouchableOpacity
          style={styles.iconAction}
          onPress={handleOpenCourier}
          accessibilityRole="button"
          accessibilityLabel="Open courier tracking page"
        >
          <ExternalLink size={15} color={Palette.gray700} />
        </TouchableOpacity>
      )}
    </View>
  );
}
