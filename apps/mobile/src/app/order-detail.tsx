import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { OrderDetailAddress } from '@/features/orders/components/order-detail-address';
import { OrderDetailCourier } from '@/features/orders/components/order-detail-courier';
import { OrderDetailHero } from '@/features/orders/components/order-detail-hero';
import { OrderDetailPricing } from '@/features/orders/components/order-detail-pricing';
import { OrderItemRow } from '@/features/orders/components/order-item-row';
import { TrackingTimeline } from '@/features/orders/components/tracking-timeline';
import { useOrderDetail } from '@/features/orders/hooks/use-orders';
import { styles } from '@/features/orders/styles/order-detail.styles';
import { isActiveOrder } from '@/features/orders/utils/order-status';

function Band() {
  return <View style={styles.sectionBand} />;
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderId = typeof params.orderId === 'string' ? params.orderId : '';
  const { isLoggedIn } = useAuth();

  const { order, loading, refreshing, error, refresh } = useOrderDetail(
    orderId,
    isLoggedIn && !!orderId,
  );

  const livePolling = !!order && isActiveOrder(order.status);
  const itemsSubtotal = useMemo(
    () => (order?.items ?? []).reduce((sum, item) => sum + item.subtotal, 0),
    [order?.items],
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.headerIconSlot}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color={Palette.gray900} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Order Details</ThemedText>
          <View style={styles.headerIconSlot} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Palette.gray900} />
          <ThemedText style={styles.loadingText}>Loading order…</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error || !order) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.headerIconSlot}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color={Palette.gray900} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Order Details</ThemedText>
          <View style={styles.headerIconSlot} />
        </View>
        <View style={styles.centerBox}>
          <ThemedText style={styles.errorText}>{error || 'Order not found.'}</ThemedText>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void refresh()}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <ThemedText style={styles.retryBtnText}>Try Again</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerIconSlot}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={Palette.gray900} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Order Details</ThemedText>
        <View style={styles.headerIconSlot} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <OrderDetailHero order={order} livePolling={livePolling} />
        <Band />

        <View style={styles.detailsContainer}>
          <ThemedText style={styles.sectionTitle}>Delivery Timeline</ThemedText>
          <TrackingTimeline events={order.trackingEvents ?? []} orderStatus={order.status} />
          <OrderDetailCourier order={order} />
        </View>
        <Band />

        <View style={styles.detailsContainer}>
          <ThemedText style={styles.sectionTitle}>Items</ThemedText>
          <View>
            {order.items.map((item, index) => (
              <OrderItemRow key={item.id} item={item} isLast={index === order.items.length - 1} />
            ))}
          </View>
          <OrderDetailPricing order={order} itemsSubtotal={itemsSubtotal} />
        </View>
        <Band />

        <OrderDetailAddress address={order.address} />
      </ScrollView>
    </ThemedView>
  );
}
