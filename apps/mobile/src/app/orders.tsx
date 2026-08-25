import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShoppingBag } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { OrderItemRow } from '@/features/orders/components/order-item-row';
import { useMyOrders } from '@/features/orders/hooks/use-orders';
import type { OrderView } from '@/features/orders/utils/order-status';
import { formatDate, getOrderStatusMeta, isActiveOrder } from '@/features/orders/utils/order-status';
import { useAuth } from '@/features/auth/context/auth-context';
import { styles } from '@/features/orders/styles/orders.styles';

const STATUS_STYLE: Record<string, TextStyle> = {
  active: styles.statusTextActive,
  success: styles.statusTextSuccess,
  warning: styles.statusTextWarning,
  danger: styles.statusTextDanger,
  neutral: styles.statusTextNeutral,
};

function OrderCard({ order }: { order: OrderView }) {
  const router = useRouter();
  const meta = getOrderStatusMeta(order.status);
  const trackable = isActiveOrder(order.status) || order.status === 'DELIVERED';

  return (
    <View style={styles.orderCard}>
      <View style={styles.cardTopRow}>
        <ThemedText style={STATUS_STYLE[meta.tone] ?? styles.statusTextNeutral}>
          {meta.label}
        </ThemedText>
        <ThemedText style={styles.dateText}>{formatDate(order.createdAt)}</ThemedText>
      </View>

      <View>
        {order.items.map((item, index) => (
          <OrderItemRow
            key={item.id}
            item={item}
            isLast={index === order.items.length - 1}
          />
        ))}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.totalRow}>
          <ThemedText style={styles.totalLabel}>
            {order.items.length} item{order.items.length === 1 ? '' : 's'} ·{' '}
            {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid Online'}
          </ThemedText>
          <ThemedText style={styles.totalValue}>
            Rs. {order.totalAmount.toLocaleString()}
          </ThemedText>
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.liveHintRow}>
            {isActiveOrder(order.status) && (
              <>
                <View style={styles.liveDot} />
                <ThemedText style={styles.liveHintText}>Live tracking</ThemedText>
              </>
            )}
            {order.status === 'DELIVERED' && (
              <ThemedText style={[styles.liveHintText, { color: Palette.success }]}>
                ✓ Delivered
              </ThemedText>
            )}
          </View>

          {trackable ? (
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => router.push({ pathname: '/order-detail', params: { orderId: order.id } })}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Track order ${order.orderNumber}`}
            >
              <ThemedText style={styles.trackBtnText}>Track</ThemedText>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function MyOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();

  const {
    orders,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
  } = useMyOrders(isLoggedIn);

  const renderOrder = ({ item }: { item: OrderView }) => (
    <>
      <OrderCard order={item} />
      <View style={styles.sectionBand} />
    </>
  );

  if (!isLoggedIn || loading) {
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
          <ThemedText style={styles.headerTitle}>My Orders</ThemedText>
          <View style={styles.headerIconSlot} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Palette.gray900} />
          <ThemedText style={styles.loadingText}>Loading your orders…</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error) {
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
          <ThemedText style={styles.headerTitle}>My Orders</ThemedText>
          <View style={styles.headerIconSlot} />
        </View>
        <View style={styles.centerBox}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void refresh()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading orders"
          >
            <ThemedText style={styles.retryBtnText}>Try Again</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  if (orders.length === 0) {
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
          <ThemedText style={styles.headerTitle}>My Orders</ThemedText>
          <View style={styles.headerIconSlot} />
        </View>
        <View style={styles.centerBox}>
          <View style={styles.emptyIconCircle}>
            <ShoppingBag size={36} color={Palette.gray400} strokeWidth={1.6} />
          </View>
          <ThemedText style={styles.emptyTitle}>No Orders Yet</ThemedText>
          <ThemedText style={styles.emptySub}>
            When you place an order, it shows up here with live delivery tracking.
          </ThemedText>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => router.replace('/(tabs)' as never)}
            accessibilityRole="button"
            accessibilityLabel="Start shopping"
          >
            <ThemedText style={styles.shopNowBtnText}>Start Shopping</ThemedText>
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
        <ThemedText style={styles.headerTitle}>My Orders</ThemedText>
        <View style={styles.headerIconSlot} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor={Palette.gray900} />
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerSpinner} color={Palette.gray900} />
          ) : null
        }
      />
    </ThemedView>
  );
}
