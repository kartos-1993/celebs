import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BellOff } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';

interface NotificationsEmptyStateProps {
  isLoggedOut?: boolean;
}

export function NotificationsEmptyState({ isLoggedOut = false }: NotificationsEmptyStateProps) {
  return (
    <View style={styles.centerBox}>
      <BellOff size={42} color={Palette.gray400} />
      <ThemedText style={styles.emptyTitle}>
        {isLoggedOut ? 'Sign in to view notifications' : 'No notifications yet'}
      </ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        {isLoggedOut
          ? 'Track real-time order updates, tracking links, and special deals.'
          : 'We will notify you about updates to your orders and offers here.'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.gray800,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Palette.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
});
