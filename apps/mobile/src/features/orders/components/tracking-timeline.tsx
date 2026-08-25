import React from 'react';
import { View } from 'react-native';

import { styles } from './tracking-timeline.styles';

import { ThemedText } from '@/components/themed-text';
import type { OrderStatus, OrderTrackingEventView } from '../utils/order-status';
import { formatDateTime, getOrderStatusMeta } from '../utils/order-status';

interface TrackingTimelineProps {
  events: OrderTrackingEventView[];
  orderStatus: OrderStatus;
}

export function TrackingTimeline({ events, orderStatus }: TrackingTimelineProps) {
  if (events.length === 0) {
    return (
      <ThemedText style={styles.emptyText}>
        No tracking updates yet. Updates appear here as your order is processed.
      </ThemedText>
    );
  }

  // Latest event first (timeline reads top-down like Shein's tracking page)
  const ordered = [...events].reverse();

  return (
    <View>
      {ordered.map((event, index) => {
        const isFirst = index === 0;
        const isLast = index === ordered.length - 1;
        const meta = getOrderStatusMeta(event.status);
        const isTerminal = orderStatus === 'CANCELLED' || orderStatus === 'RETURNED';

        return (
          <View key={event.id} style={styles.eventRow}>
            {/* Rail */}
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  (isFirst || !isTerminal) && styles.dotFilled,
                  isTerminal && event.status === orderStatus && styles.dotDanger,
                  isFirst && !isTerminal && styles.dotPulseRing,
                ]}
              />
              {!isLast && <View style={[styles.line, isFirst && styles.lineFilled]} />}
            </View>

            {/* Content */}
            <View style={[styles.content, !isLast && styles.contentSpaced]}>
              <ThemedText
                style={[styles.title, isFirst && !isTerminal ? styles.titleActive : undefined]}
              >
                {event.title}
              </ThemedText>
              {!!event.description && (
                <ThemedText style={styles.description}>{event.description}</ThemedText>
              )}
              <ThemedText style={styles.timestamp}>
                {formatDateTime(event.timestamp)}
                {event.location ? ` · ${event.location}` : ''}
                {isFirst && !isTerminal && meta.tone === 'active' ? ' · Latest update' : ''}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}
