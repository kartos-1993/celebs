import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { OrderStatus } from '../utils/order-status';
import { getOrderStatusMeta } from '../utils/order-status';

import { ThemedText } from '@/components/themed-text';
import { FontWeight, Radius } from '@/constants/theme';

interface OrderCardBadgeProps {
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod?: string;
}

interface BadgeTheme {
  bg: string;
  text: string;
}

const TONE_THEMES: Record<string, BadgeTheme> = {
  warning: { bg: '#FFF7ED', text: '#C2410C' },
  active: { bg: '#EFF6FF', text: '#1D4ED8' },
  success: { bg: '#F0FDF4', text: '#15803D' },
  danger: { bg: '#FEF2F2', text: '#B91C1C' },
  neutral: { bg: '#F8FAFC', text: '#64748B' },
};

export function OrderCardBadge({ status, paymentStatus, paymentMethod }: OrderCardBadgeProps) {
  const isUnpaid =
    (paymentStatus === 'PENDING' || status === 'PENDING_PAYMENT') &&
    paymentMethod !== 'COD' &&
    status !== 'CANCELLED' &&
    status !== 'RETURNED';
  const meta = getOrderStatusMeta(status);
  const toneKey = isUnpaid ? 'warning' : meta.tone;
  const theme = TONE_THEMES[toneKey] ?? TONE_THEMES.neutral;
  const label = isUnpaid ? 'To Pay' : meta.label;

  return (
    <View style={[styles.badge, { backgroundColor: theme.bg }]}>
      <ThemedText
        allowFontScaling={false}
        maxFontSizeMultiplier={1}
        style={[styles.badgeText, { color: theme.text }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
});
