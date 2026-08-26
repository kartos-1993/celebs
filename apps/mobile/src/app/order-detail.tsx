import React from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ExternalLink, MapPin, Truck } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { OrderItemRow } from '@/features/orders/components/order-item-row';
import { TrackingTimeline } from '@/features/orders/components/tracking-timeline';
import { LIVE_POLL_INTERVAL_MS, useOrderDetail } from '@/features/orders/hooks/use-orders';
import { styles } from '@/features/orders/styles/order-detail.styles';
import type { OrderView } from '@/features/orders/utils/order-status';
import {
  formatDate,
  getOrderStatusMeta,
  isActiveOrder,
} from '@/features/orders/utils/order-status';

const STATUS_STYLE: Record<string, object> = {
  active: styles.statusTextActive,
  success: styles.statusTextSuccess,
  warning: styles.statusTextWarning,
  danger: styles.statusTextDanger,
  neutral: styles.statusTextNeutral,
};

function Section({ children }: { children: React.ReactNode }) {
  return <View style={styles.detailsContainer}>{children}</View>;
}

function Band() {
  return <View style={styles.sectionBand} />;
}

function AddressBlock({ order }: { order: OrderView }) {
  if (!order.address) return null;
  const address = order.address;
  const line2 = [address.cityArea, address.district, address.province].filter(Boolean).join(', ');

  return (
    <Section>
      <View style={styles.sectionHeaderRow}>
        <MapPin size={16} color={Palette.gray900} />
        <ThemedText style={styles.sectionTitle}>Delivery Address</ThemedText>
      </View>
      <View style={{ gap: Spacing.xxs }}>
        <ThemedText style={styles.addressName}>{address.fullName}</ThemedText>
        <ThemedText style={styles.addressLine}>{address.phone}</ThemedText>
        <ThemedText style={styles.addressLine}>{address.streetAddress}</ThemedText>
        <ThemedText style={styles.addressLine}>{line2}</ThemedText>
        {address.landmark ? (
          <ThemedText style={styles.addressLine}>Landmark: {address.landmark}</ThemedText>
        ) : null}
      </View>
    </Section>
  );
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

  const handleOpenCourier = () => {
    if (!order?.trackingUrl) return;
    Linking.openURL(order.trackingUrl).catch(() => undefined);
  };

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

  const meta = getOrderStatusMeta(order.status);
  const itemsSubtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);

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
        {/* Status hero */}
        <Section>
          <View style={styles.heroRow}>
            <ThemedText style={STATUS_STYLE[meta.tone] ?? styles.statusTextNeutral}>
              {meta.label}
              {livePolling ? ' · Live' : ''}
            </ThemedText>
            <ThemedText style={styles.dateText}>{formatDate(order.createdAt)}</ThemedText>
          </View>
          <ThemedText style={styles.orderNo}>{order.orderNumber}</ThemedText>
          {order.estimatedDelivery ? (
            <ThemedText style={styles.etaText}>
              Estimated delivery: {formatDate(order.estimatedDelivery)}
            </ThemedText>
          ) : null}
          {livePolling ? (
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <ThemedText style={styles.liveText}>
                Tracking live · updates every {LIVE_POLL_INTERVAL_MS / 1000}s
              </ThemedText>
            </View>
          ) : null}
        </Section>

        <Band />

        {/* Tracking timeline */}
        <Section>
          <ThemedText style={styles.sectionTitle}>Delivery Timeline</ThemedText>
          <TrackingTimeline events={order.trackingEvents ?? []} orderStatus={order.status} />

          {(order.courierName || order.trackingNumber) && (
            <View style={styles.courierCard}>
              <Truck size={16} color={Palette.gray800} />
              <View style={styles.courierInfo}>
                <ThemedText style={styles.courierName}>
                  {order.courierName || order.courierProvider || 'Courier'}
                </ThemedText>
                {!!order.trackingNumber && (
                  <ThemedText style={styles.courierWaybill}>
                    Waybill {order.trackingNumber}
                  </ThemedText>
                )}
              </View>
              {!!order.trackingUrl && (
                <TouchableOpacity
                  style={styles.iconAction}
                  onPress={handleOpenCourier}
                  accessibilityRole="button"
                  accessibilityLabel="Open courier tracking page"
                >
                  <ExternalLink size={15} color={Palette.gray700} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </Section>

        <Band />

        {/* Items */}
        <Section>
          <ThemedText style={styles.sectionTitle}>Items</ThemedText>
          <View>
            {order.items.map((item, index) => (
              <OrderItemRow key={item.id} item={item} isLast={index === order.items.length - 1} />
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Items subtotal</ThemedText>
            <ThemedText style={styles.summaryValue}>
              Rs. {itemsSubtotal.toLocaleString()}
            </ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Delivery</ThemedText>
            {order.shippingFee === 0 ? (
              <ThemedText style={styles.freeText}>FREE</ThemedText>
            ) : (
              <ThemedText style={styles.summaryValue}>
                Rs. {order.shippingFee.toLocaleString()}
              </ThemedText>
            )}
          </View>
          {order.discountAmount > 0 ? (
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Discount</ThemedText>
              <ThemedText style={styles.discountValue}>
                - Rs. {order.discountAmount.toLocaleString()}
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <ThemedText style={styles.totalLabel}>
              Grand Total ·{' '}
              {order.paymentMethod === 'COD'
                ? `COD (${order.paymentStatus})`
                : `${order.paymentMethod} (${order.paymentStatus})`}
            </ThemedText>
            <ThemedText style={styles.totalValue}>
              Rs. {order.totalAmount.toLocaleString()}
            </ThemedText>
          </View>
        </Section>

        <Band />

        {/* Address */}
        <AddressBlock order={order} />
      </ScrollView>
    </ThemedView>
  );
}
