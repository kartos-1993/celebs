import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  NotificationFilterTabs,
  type NotificationTab,
} from '@/features/notifications/components/notification-filter-tabs';
import { NotificationItemCard } from '@/features/notifications/components/notification-item-card';
import { NotificationsEmptyState } from '@/features/notifications/components/notifications-empty-state';
import { NotificationsHeader } from '@/features/notifications/components/notifications-header';
import {
  useMarkAllAsReadMutation,
  useMarkNotificationAsReadMutation,
  useNotificationsQuery,
  useUnreadCountQuery,
} from '@/features/notifications/hooks/use-notifications';
import type { NotificationItemMobile } from '@/features/notifications/types';
import { filterNotificationsByTab } from '@/features/notifications/utils/notification-filter.util';
import { resolveNotificationRoute } from '@/features/notifications/utils/notification-navigation.util';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<NotificationTab>('ALL');

  const { data: notifications = [], isLoading, refetch, isRefetching } = useNotificationsQuery();
  const { data: unreadData } = useUnreadCountQuery();
  const markAsReadMutation = useMarkNotificationAsReadMutation();
  const markAllAsReadMutation = useMarkAllAsReadMutation();

  const unreadCount = unreadData?.count ?? unreadData?.unreadCount ?? 0;
  const hasUnread = unreadCount > 0;

  const itemsList = Array.isArray(notifications) ? notifications : [];
  const filteredNotifications = useMemo(
    () => filterNotificationsByTab(itemsList, activeTab),
    [itemsList, activeTab],
  );

  const handleNotificationPress = useCallback(
    (notification: NotificationItemMobile) => {
      if (!notification.isRead) {
        markAsReadMutation.mutate(notification.id);
      }

      const targetRoute = resolveNotificationRoute(notification);
      if (targetRoute) {
        router.push(targetRoute as never);
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
        <NotificationsEmptyState isLoggedOut />
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

      <NotificationFilterTabs activeTab={activeTab} onSelectTab={setActiveTab} />

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Palette.brand} />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
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
          ListEmptyComponent={<NotificationsEmptyState />}
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
  },
  listContent: {
    flexGrow: 1,
  },
});
