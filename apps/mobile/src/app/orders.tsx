import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { InAppPaymentSheet } from '@/features/checkout/components/in-app-payment-sheet';
import { OrderCard } from '@/features/orders/components/order-card';
import { OrderStatusTabs } from '@/features/orders/components/order-status-tabs';
import { OrdersEmptyState } from '@/features/orders/components/orders-empty-state';
import { OrdersHeader } from '@/features/orders/components/orders-header';
import { useCancelOrderMutation } from '@/features/orders/hooks/use-cancel-order';
import { useMyOrders, useOrderSummaryCounts } from '@/features/orders/hooks/use-orders';
import { styles } from '@/features/orders/styles/orders.styles';
import {
  type ActivePaymentSheet,
  buildOrderPaymentIntent,
} from '@/features/orders/utils/order-payment-utils';
import type { OrderFilterTab } from '@/features/orders/utils/order-status';
import { matchesOrderFilter } from '@/features/orders/utils/order-status';
import { ReviewModal } from '@/features/reviews/components/review-modal';
import { ToReviewCard } from '@/features/reviews/components/to-review-card';
import { useToReviewItems } from '@/features/reviews/hooks/use-reviews';
import type { ToReviewItem } from '@/features/reviews/types';

export default function MyOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<OrderFilterTab>('ALL');
  const [activePayment, setActivePayment] = useState<ActivePaymentSheet | null>(null);
  const [reviewingItem, setReviewingItem] = useState<ToReviewItem | null>(null);

  const { orders, loading, loadingMore, refresh, loadMore } = useMyOrders(isLoggedIn);
  const { counts, refetch: refetchCounts } = useOrderSummaryCounts(isLoggedIn);
  const {
    items: toReviewItems,
    loading: toReviewLoading,
    refetch: refetchToReview,
  } = useToReviewItems(isLoggedIn && activeTab === 'TO_REVIEW');
  const { cancelOrder } = useCancelOrderMutation();

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderFilter(order, activeTab)),
    [orders, activeTab],
  );

  const handleRefresh = useCallback(() => {
    refresh();
    refetchCounts();
    if (activeTab === 'TO_REVIEW') refetchToReview();
  }, [refresh, refetchCounts, refetchToReview, activeTab]);

  if (!isLoggedIn || (loading && orders.length === 0)) {
    return (
      <ThemedView style={styles.container}>
        <OrdersHeader paddingTop={insets.top} />
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

  const isToReview = activeTab === 'TO_REVIEW';

  return (
    <ThemedView style={styles.container}>
      <OrdersHeader paddingTop={insets.top} />
      <OrderStatusTabs activeTab={activeTab} onSelectTab={setActiveTab} counts={counts} />

      {isToReview ? (
        <FlatList
          data={toReviewItems}
          keyExtractor={(item) => item.orderItemId}
          renderItem={({ item }) => <ToReviewCard item={item} onPressReview={setReviewingItem} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={toReviewLoading} onRefresh={handleRefresh} />}
          ListEmptyComponent={<OrdersEmptyState activeTab={activeTab} />}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPayNow={(o) => setActivePayment(buildOrderPaymentIntent(o))}
              onCancel={(o) => cancelOrder(o.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
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
      )}

      <ReviewModal
        visible={!!reviewingItem}
        item={reviewingItem}
        onClose={() => {
          setReviewingItem(null);
          handleRefresh();
        }}
      />

      <InAppPaymentSheet
        visible={!!activePayment}
        paymentUrl={activePayment?.paymentUrl ?? null}
        title={activePayment?.title ?? 'Payment'}
        onClose={() => {
          setActivePayment(null);
          handleRefresh();
        }}
        onSuccess={() => {
          setActivePayment(null);
          handleRefresh();
        }}
      />
    </ThemedView>
  );
}
