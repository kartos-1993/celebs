import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, ExternalLink, ShoppingBag, Truck } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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
          <ChevronLeft size={24} color="#18181b" />
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
                  <ShoppingBag size={22} color="#208AEF" />
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
                            {isPassed && <CheckCircle2 size={12} color="#ffffff" />}
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
                  <Truck size={14} color="#7c3aed" />
                  <ThemedText style={styles.courierText}>
                    {ord.courierPartner || 'Nepal Can Move'}:{' '}
                    <ThemedText style={styles.trackingNo}>{ord.trackingNumber}</ThemedText>
                  </ThemedText>
                  <ExternalLink size={12} color="#7c3aed" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  orderDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
  },
  productIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  productVariant: {
    fontSize: 11,
    color: '#64748b',
  },
  amountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#208AEF',
    marginTop: 2,
  },
  trackerContainer: {
    gap: 8,
    marginTop: 4,
  },
  trackerHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCol: {
    alignItems: 'center',
    gap: 4,
    width: 60,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotPassed: {
    backgroundColor: '#16a34a',
  },
  stepLabel: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
  },
  stepLabelPassed: {
    color: '#16a34a',
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 14,
  },
  stepLinePassed: {
    backgroundColor: '#16a34a',
  },
  courierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3e8ff',
    padding: 8,
    borderRadius: 8,
  },
  courierText: {
    fontSize: 11,
    color: '#6b21a8',
  },
  trackingNo: {
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
