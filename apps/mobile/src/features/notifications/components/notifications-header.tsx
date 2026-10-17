import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCheck } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';

export interface NotificationsHeaderProps {
  paddingTop: number;
  hasUnread: boolean;
  onMarkAllRead: () => void;
  isMarkingAll: boolean;
}

export function NotificationsHeader({
  paddingTop,
  hasUnread,
  onMarkAllRead,
  isMarkingAll,
}: NotificationsHeaderProps) {
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: paddingTop + Spacing.xs }]}>
      <View style={styles.leftRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={Palette.gray900} />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Notifications</ThemedText>
      </View>

      {hasUnread && (
        <TouchableOpacity
          onPress={onMarkAllRead}
          disabled={isMarkingAll}
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <CheckCheck size={16} color={Palette.brand} />
          <ThemedText style={styles.actionText}>Mark all read</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xxs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.gray900,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.brand,
  },
});
