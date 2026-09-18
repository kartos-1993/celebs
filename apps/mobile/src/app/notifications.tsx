import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BellOff } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { NotificationItemCard } from '@/features/notifications/components/notification-item-card';
import { NotificationsHeader } from '@/features/notifications/components/notifications-header';
import {
  useMarkAllAsReadMutation,
  useMarkNotificationAsReadMutation,
  useNotificationsQuery,
  useUnreadCountQuery,
} from '@/features/notifications/hooks/use-notifications';
import type { NotificationItemMobile } from '@/features/notifications/types';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const { data, isLoading, refetch, isRefetching } = useNotificationsQuery();
  const { data: unreadData } = useUnreadCountQuery();
  const markAsReadMutation = useMarkNotificationAsReadMutation();
  const markAllAsReadMutation = useMarkAllAsReadMutation();

  const hasUnread = (unreadData?.unreadCount ?? 0) > 0;

  const handleNotificationPress = useCallback(
    (notification: NotificationItemMobile) => {
      if (!notification.isRead) {
        markAsReadMutation.mutate(notification.id);
      }

      const deepLink = notification.data?.url as string | undefined;
      const orderId = notification.data?.orderId as string | undefined;

      if (deepLink && deepLink.startsWith('/')) {
        router.push(deepLink as never);
      } else if (orderId) {
        router.push({ pathname: '/order-detail', params: { id: orderId } } as never);
      }
    },
    [markAsReadMutation, router],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  if (!isLoggedIn) {
    return (
      <ThemedView style={styles.container}>
        <NotificationsHeader
          paddingTop={insets.top}
          hasUnread={false}
          onMarkAllRead={handleMarkAllRead}
          isMarkingAll={false}
        />
        <View style={styles.centerBox}>
          <BellOff size={44} color={Palette.gray400} />
          <ThemedText style={styles.emptyTitle}>Sign in to view notifications</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Track real-time order updates, tracking links, and special deals.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <NotificationsHeader
        paddingTop={insets.top}
        hasUnread={hasUnread}
        onMarkAllRead={handleMarkAllRead}
        isMarkingAll={markAllAsReadMutation.isPending}
      />

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Palette.brand} />
        </View>
      ) : (
        <FlatList
          data={data?.notifications ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItemCard notification={item} onPress={handleNotificationPress} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Palette.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <BellOff size={40} color={Palette.gray400} />
              <ThemedText style={styles.emptyTitle}>No notifications yet</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                We will notify you about updates to your orders and offers here.
              </ThemedText>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.white,
  },
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
  listContent: {
    flexGrow: 1,
  },
});
