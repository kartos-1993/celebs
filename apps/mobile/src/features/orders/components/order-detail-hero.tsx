import React from 'react';
import { View } from 'react-native';

import { LIVE_POLL_INTERVAL_MS } from '../hooks/use-orders';
import { styles } from '../styles/order-detail.styles';
import type { OrderView } from '../utils/order-status';
import { formatDate, getOrderStatusMeta } from '../utils/order-status';

import { ThemedText } from '@/components/themed-text';

const STATUS_STYLE: Record<string, object> = {
  active: styles.statusTextActive,
  success: styles.statusTextSuccess,
  warning: styles.statusTextWarning,
  danger: styles.statusTextDanger,
  neutral: styles.statusTextNeutral,
};

interface OrderDetailHeroProps {
  order: OrderView;
  livePolling: boolean;
}

export function OrderDetailHero({ order, livePolling }: OrderDetailHeroProps) {
  const meta = getOrderStatusMeta(order.status);

  return (
    <View style={styles.detailsContainer}>
      <View style={styles.heroRow}>
        <ThemedText style={STATUS_STYLE[meta.tone] ?? styles.statusTextNeutral}>
          {meta.label}
          {livePolling ? ' · Live' : ''}
        </ThemedText>
        <ThemedText style={styles.dateText}>{formatDate(order.createdAt)}</ThemedText>
      </View>
      <ThemedText style={styles.orderNo}>{order.orderNumber}</ThemedText>
      {order.estimatedDelivery ? (
        <ThemedText style={styles.etaText}>
          Estimated delivery: {formatDate(order.estimatedDelivery)}
        </ThemedText>
      ) : null}
      {livePolling ? (
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <ThemedText style={styles.liveText}>
            Tracking live · updates every {LIVE_POLL_INTERVAL_MS / 1000}s
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}
