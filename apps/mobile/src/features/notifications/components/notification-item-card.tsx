import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AlertCircle, Bell, Package } from 'lucide-react-native';

import type { NotificationItemMobile } from '../types';
import { formatRelativeTime } from '../utils/notification-time.util';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';

export interface NotificationItemCardProps {
  notification: NotificationItemMobile;
  onPress: (item: NotificationItemMobile) => void;
}

export function NotificationItemCard({ notification, onPress }: NotificationItemCardProps) {
  const isCritical = notification.severity === 'CRITICAL';
  const isWarning = notification.severity === 'WARNING';

  const getIcon = () => {
    if (isCritical) return <AlertCircle size={20} color={Palette.danger} />;
    if (notification.type === 'ORDER_STATUS') return <Package size={20} color={Palette.brand} />;
    if (isWarning) return <AlertCircle size={20} color={Palette.warning} />;
    return <Bell size={20} color={Palette.gray600} />;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(notification)}
      style={[styles.card, !notification.isRead && styles.unreadCard]}
    >
      <View style={styles.iconCol}>{getIcon()}</View>

      <View style={styles.contentCol}>
        <View style={styles.headerRow}>
          <ThemedText style={[styles.title, !notification.isRead && styles.unreadTitle]}>
            {notification.title}
          </ThemedText>
          {!notification.isRead && <View style={styles.unreadDot} />}
        </View>

        <ThemedText style={styles.body} numberOfLines={2}>
          {notification.body}
        </ThemedText>

        <ThemedText style={styles.timestamp}>
          {formatRelativeTime(notification.createdAt)}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    backgroundColor: Palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray200,
    gap: Spacing.sm,
  },
  unreadCard: {
    backgroundColor: Palette.brandTint + '40',
  },
  iconCol: {
    paddingTop: 2,
  },
  contentCol: {
    flex: 1,
    gap: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: Palette.gray900,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.brand,
  },
  body: {
    fontSize: 13,
    color: Palette.gray600,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 11,
    color: Palette.gray400,
    marginTop: 2,
  },
});
