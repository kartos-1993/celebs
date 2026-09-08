import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { OrderStatus } from '../utils/order-status';
import { getOrderStatusMeta } from '../utils/order-status';

import { ThemedText } from '@/components/themed-text';
import { FontWeight, Radius } from '@/constants/theme';

interface OrderCardBadgeProps {
  status: OrderStatus;
  paymentStatus: string;
}

interface BadgeTheme {
  bg: string;
  text: string;
  border: string;
}

const TONE_THEMES: Record<string, BadgeTheme> = {
  warning: { bg: '#FFF7ED', text: '#C2410C', border: '#FFEDD5' },
  active: { bg: '#EFF6FF', text: '#1D4ED8', border: '#DBEAFE' },
  success: { bg: '#F0FDF4', text: '#15803D', border: '#DCFCE7' },
  danger: { bg: '#FEF2F2', text: '#B91C1C', border: '#FEE2E2' },
  neutral: { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' },
};

export function OrderCardBadge({ status, paymentStatus }: OrderCardBadgeProps) {
  const isUnpaid = paymentStatus === 'PENDING' || status === 'PENDING_PAYMENT';
  const meta = getOrderStatusMeta(status);
  const toneKey = isUnpaid ? 'warning' : meta.tone;
  const theme = TONE_THEMES[toneKey] ?? TONE_THEMES.neutral;
  const label = isUnpaid ? 'To Pay' : meta.label;

  return (
    <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <ThemedText style={[styles.badgeText, { color: theme.text }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radius.xs,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    lineHeight: 13,
    letterSpacing: 0.1,
  },
});
