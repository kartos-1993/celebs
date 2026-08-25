import React, { useState } from 'react';
import { Linking, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, ExternalLink, ShoppingBag, Truck } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { styles } from '@/features/orders/styles/orders.styles';

interface OrderItem {
  id: string;
  orderNumber: string;
  date: string;
  productName: string;
  variant: string;
  totalAmount: number;
  paymentMethod: string;
  status:
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'PACKED'
    | 'HANDED_OVER'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'CANCELLED';
  courierPartner?: string;
  trackingNumber?: string;
}

const DEMO_ORDERS: OrderItem[] = [
  {
    id: 'ord_1',
    orderNumber: 'CEL-2026-89412',
    date: 'Aug 03, 2026',
    productName: 'Oversized Streetwear Hoodie',
    variant: 'Washed Black (Size L)',
    totalAmount: 3649,
    paymentMethod: 'COD',
    status: 'CONFIRMED',
  },
  {
    id: 'ord_2',
    orderNumber: 'CEL-2026-89415',
    date: 'Aug 03, 2026',
    productName: 'Baggy Fit Vintage Denim',
    variant: 'Ocean Blue (Size M)',
    totalAmount: 5798,
    paymentMethod: 'STRIPE',
    status: 'PACKED',
    courierPartner: 'Upaya Logistics',
    trackingNumber: 'UPY-98214-NP',
  },
  {
    id: 'ord_3',
    orderNumber: 'CEL-2026-89390',
    date: 'Aug 02, 2026',
    productName: 'Cropped Linen Shirt',
    variant: 'Off White (Size S)',
    totalAmount: 1999,
    paymentMethod: 'ESEWA',
    status: 'DELIVERED',
    courierPartner: 'Nepal Can Move',
    trackingNumber: 'NCM-77123-KT',
  },
];

const STAGES = [
  { key: 'CONFIRMED', label: 'Order Placed' },
  { key: 'PACKED', label: 'Vendor Packed' },
  { key: 'HANDED_OVER', label: 'In Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export default function MyOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders] = useState<OrderItem[]>(DEMO_ORDERS);

  const getStageIndex = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'PENDING_PAYMENT':
        return 0;
      case 'PACKED':
        return 1;
      case 'HANDED_OVER':
      case 'OUT_FOR_DELIVERY':
        return 2;
      case 'DELIVERED':
        return 3;
      default:
        return 0;
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Palette.gray900} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>My Orders</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {orders.map((ord) => {
          const currentStageIdx = getStageIndex(ord.status);

          return (
            <View key={ord.id} style={styles.orderCard}>
              {/* Card Top Header */}
              <View style={styles.cardHeader}>
                <View>
                  <ThemedText style={styles.orderNo}>{ord.orderNumber}</ThemedText>
                  <ThemedText style={styles.orderDate}>{ord.date}</ThemedText>
                </View>
                <View style={styles.badge}>
                  <ThemedText style={styles.badgeText}>{ord.status.replace('_', ' ')}</ThemedText>
                </View>
              </View>

              {/* Product Info */}
              <View style={styles.productRow}>
                <View style={styles.productIconBox}>
                  <ShoppingBag size={22} color={Palette.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.productTitle}>{ord.productName}</ThemedText>
                  <ThemedText style={styles.productVariant}>{ord.variant}</ThemedText>
                  <ThemedText style={styles.amountText}>
                    Rs. {ord.totalAmount.toLocaleString()} ({ord.paymentMethod})
                  </ThemedText>
                </View>
              </View>

              {/* Visual Order Progress Tracker Bar */}
              <View style={styles.trackerContainer}>
                <ThemedText style={styles.trackerHeaderTitle}>Live Delivery Timeline</ThemedText>
                <View style={styles.timelineRow}>
                  {STAGES.map((stage, idx) => {
                    const isPassed = idx <= currentStageIdx;

                    return (
                      <React.Fragment key={stage.key}>
                        <View style={styles.stepCol}>
                          <View style={[styles.stepDot, isPassed && styles.stepDotPassed]}>
                            {isPassed && <CheckCircle2 size={12} color={Palette.white} />}
                          </View>
                          <ThemedText
                            style={[styles.stepLabel, isPassed && styles.stepLabelPassed]}
                          >
                            {stage.label}
                          </ThemedText>
                        </View>
                        {idx < STAGES.length - 1 && (
                          <View
                            style={[
                              styles.stepLine,
                              idx < currentStageIdx && styles.stepLinePassed,
                            ]}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>

              {/* Courier tracking details if available */}
              {ord.trackingNumber && (
                <TouchableOpacity
                  style={styles.courierRow}
                  activeOpacity={0.8}
                  onPress={() => {
                    const url =
                      ord.courierPartner === 'Nepal Can Move'
                        ? `https://nepalcanmove.com/track/${ord.trackingNumber}`
                        : `https://upayacitycargo.com/track/${ord.trackingNumber}`;
                    Linking.openURL(url).catch(() => console.log('Could not open tracking URL'));
                  }}
                >
                  <Truck size={14} color={Palette.accent} />
                  <ThemedText style={styles.courierText}>
                    {ord.courierPartner || 'Nepal Can Move'}:{' '}
                    <ThemedText style={styles.trackingNo}>{ord.trackingNumber}</ThemedText>
                  </ThemedText>
                  <ExternalLink
                    size={12}
                    color={Palette.accent}
                    style={{ marginLeft: Spacing.xs }}
                  />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}
