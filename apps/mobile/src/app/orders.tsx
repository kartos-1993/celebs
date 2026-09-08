import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { InAppPaymentSheet } from '@/features/checkout/components/in-app-payment-sheet';
import { OrderCard } from '@/features/orders/components/order-card';
import { OrderStatusTabs } from '@/features/orders/components/order-status-tabs';
import { OrdersEmptyState } from '@/features/orders/components/orders-empty-state';
import { useCancelOrderMutation } from '@/features/orders/hooks/use-cancel-order';
import { useMyOrders } from '@/features/orders/hooks/use-orders';
import { styles } from '@/features/orders/styles/orders.styles';
import {
  type ActivePaymentSheet,
  buildOrderPaymentIntent,
} from '@/features/orders/utils/order-payment-utils';
import type { OrderFilterTab, OrderView } from '@/features/orders/utils/order-status';
import { matchesOrderFilter } from '@/features/orders/utils/order-status';

export default function MyOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<OrderFilterTab>('ALL');
  const [activePayment, setActivePayment] = useState<ActivePaymentSheet | null>(null);

  const { orders, loading, loadingMore, refresh, loadMore } = useMyOrders(isLoggedIn);
  const { cancelOrder } = useCancelOrderMutation();

  const unpaidCount = useMemo(
    () =>
      orders.filter((o) => o.paymentStatus === 'PENDING' || o.status === 'PENDING_PAYMENT').length,
    [orders],
  );

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderFilter(order, activeTab)),
    [orders, activeTab],
  );

  const handlePayNow = (order: OrderView) => {
    setActivePayment(buildOrderPaymentIntent(order));
  };

  const handlePaymentClose = () => {
    setActivePayment(null);
    refresh();
  };

  if (!isLoggedIn || (loading && orders.length === 0)) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.headerIconSlot} onPress={() => router.back()}>
            <ChevronLeft size={24} color={Palette.gray900} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>My Orders</ThemedText>
          <View style={styles.headerIconSlot} />
        </View>
        <View style={styles.centerBox}>
          {loading ? (
            <ActivityIndicator size="large" color={Palette.gray900} />
          ) : (
            <ThemedText style={styles.emptySub}>Please sign in to view your orders.</ThemedText>
          )}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerIconSlot} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Palette.gray900} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>My Orders</ThemedText>
        <View style={styles.headerIconSlot} />
      </View>

      <OrderStatusTabs activeTab={activeTab} onSelectTab={setActiveTab} unpaidCount={unpaidCount} />

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPayNow={handlePayNow}
            onCancel={(order) => cancelOrder(order.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Palette.gray900} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerSpinner}>
              <ActivityIndicator size="small" color={Palette.gray900} />
            </View>
          ) : null
        }
        ListEmptyComponent={<OrdersEmptyState activeTab={activeTab} />}
      />

      <InAppPaymentSheet
        visible={!!activePayment}
        paymentUrl={activePayment?.paymentUrl ?? null}
        title={activePayment?.title ?? 'Payment'}
        onClose={handlePaymentClose}
        onSuccess={() => handlePaymentClose()}
      />
    </ThemedView>
  );
}
