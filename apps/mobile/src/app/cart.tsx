import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from 'react-native';

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, ShoppingBag, Plus, Minus, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCart } from '@/features/cart/context/cart-context';
import { resolveImageUrl } from '@/features/products/hooks/use-products';
import { CartItemHydrated } from '@celebs/shared-types';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const { cart, loading, error, subtotal, itemCount, updateQuantity, removeItem, clearCart } =
    useCart();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const items = cart?.items || [];
  const hasStockIssues = cart?.hasStockIssues || false;

  const handleIncrement = async (itemId: string, currentQty: number, maxStock: number) => {
    if (currentQty >= maxStock) return;
    setUpdatingId(itemId);
    try {
      await updateQuantity(itemId, currentQty + 1);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDecrement = async (itemId: string, currentQty: number) => {
    setUpdatingId(itemId);
    try {
      if (currentQty <= 1) {
        await removeItem(itemId);
      } else {
        await updateQuantity(itemId, currentQty - 1);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCheckout = () => {
    // Navigate to checkout or trigger Auth if unauthenticated
    router.push('/');
  };

  if (loading && items.length === 0) {
    return (
      <View style={[styles.centerBox, { backgroundColor: isDark ? '#121212' : '#ffffff' }]}>
        <ActivityIndicator size="large" color={isDark ? '#ffffff' : '#000000'} />
        <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>Loading Cart...</ThemedText>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: isDark ? '#1c1c1e' : '#f3f4f6' },
            ]}
          >
            <ShoppingBag size={48} color={isDark ? '#9ca3af' : '#6b7280'} />
          </View>
          <ThemedText style={styles.emptyTitle}>Your Cart is Empty</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            Looks like you haven't added any items to your shopping cart yet.
          </ThemedText>
          <TouchableOpacity
            style={styles.exploreBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/')}
          >
            <ThemedText style={styles.exploreBtnText}>Explore Products</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const shippingFee = subtotal >= 99 ? 0 : 150;
  const grandTotal = subtotal + shippingFee;

  return (
    <ThemedView style={styles.container}>
      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? '#121212' : '#ffffff',
            borderBottomColor: isDark ? '#2c2c2e' : '#f3f4f6',
          },
        ]}
      >
        <ThemedText style={styles.headerTitle}>
          Shopping Cart <ThemedText style={styles.headerCount}>({itemCount})</ThemedText>
        </ThemedText>
        <TouchableOpacity activeOpacity={0.7} onPress={() => clearCart()}>
          <ThemedText style={styles.clearCartText}>Clear All</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Stock Issue Banner */}
        {hasStockIssues && (
          <View style={[styles.warningBanner, { backgroundColor: isDark ? '#451a03' : '#fffbeb' }]}>
            <AlertTriangle size={18} color="#d97706" />
            <ThemedText style={[styles.warningText, { color: isDark ? '#fcd34d' : '#b45309' }]}>
              Some items in your cart have limited or updated stock availability.
            </ThemedText>
          </View>
        )}

        {/* Cart Item Cards */}
        {items.map((item: CartItemHydrated) => {

          const isBusy = updatingId === item.id;
          const imageUrl = resolveImageUrl(item.image);

          return (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' },
                !item.isAvailable && { opacity: 0.7 },
              ]}
            >
              <Image source={{ uri: imageUrl }} style={styles.itemImage} contentFit="cover" />

              <View style={styles.itemDetails}>
                <View style={styles.itemTopRow}>
                  <ThemedText style={styles.itemBrand}>{item.productBrand || 'CELEBS'}</ThemedText>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => removeItem(item.id)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <ThemedText style={styles.itemTitle} numberOfLines={2}>
                  {item.productName}
                </ThemedText>

                <ThemedText style={styles.itemMeta}>
                  Color: {item.colorVariantName} · Size: {item.size}
                </ThemedText>

                {/* Stock Warning Badge */}
                {Boolean(item.stockWarning) && (
                  <View style={styles.stockBadge}>
                    <ThemedText
                      style={[
                        styles.stockBadgeText,
                        item.availableStock <= 0 ? { color: '#ef4444' } : { color: '#f59e0b' },
                      ]}
                    >
                      {item.stockWarning}
                    </ThemedText>
                  </View>
                )}

                {/* Price and Stepper Row */}
                <View style={styles.priceStepperRow}>
                  <ThemedText style={styles.itemPrice}>
                    Rs. {item.price.toLocaleString()}
                  </ThemedText>

                  <View
                    style={[
                      styles.stepperContainer,
                      { backgroundColor: isDark ? '#2c2c2e' : '#f3f4f6' },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={isBusy}
                      onPress={() => handleDecrement(item.id, item.quantity)}
                      style={styles.stepperBtn}
                    >
                      <Minus size={14} color={isDark ? '#ffffff' : '#1c1c1e'} />
                    </TouchableOpacity>

                    {isBusy ? (
                      <ActivityIndicator size="small" color={isDark ? '#ffffff' : '#000000'} />
                    ) : (
                      <ThemedText style={styles.stepperQty}>{item.quantity}</ThemedText>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={isBusy || item.quantity >= item.availableStock}
                      onPress={() => handleIncrement(item.id, item.quantity, item.availableStock)}
                      style={[
                        styles.stepperBtn,
                        item.quantity >= item.availableStock && { opacity: 0.3 },
                      ]}
                    >
                      <Plus size={14} color={isDark ? '#ffffff' : '#1c1c1e'} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* Order Summary */}
        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
          <ThemedText style={styles.summaryTitle}>Order Summary</ThemedText>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
            <ThemedText style={styles.summaryValue}>Rs. {subtotal.toLocaleString()}</ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Estimated Shipping</ThemedText>
            <ThemedText style={[styles.summaryValue, shippingFee === 0 && { color: '#10b981' }]}>
              {shippingFee === 0 ? 'FREE' : `Rs. ${shippingFee}`}
            </ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={styles.totalValue}>Rs. {grandTotal.toLocaleString()}</ThemedText>
          </View>

          <View style={styles.guaranteeRow}>
            <ShieldCheck size={16} color="#10b981" />
            <ThemedText style={styles.guaranteeText}>
              Guaranteed Safe & Secure Checkout
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Checkout Bottom Bar */}
      <View
        style={[
          styles.checkoutBar,
          {
            bottom: Platform.OS === 'ios' ? 88 : 64,
            backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
            borderTopColor: isDark ? '#2c2c2e' : '#e5e7eb',
          },
        ]}
      >

        <View>
          <ThemedText style={styles.checkoutTotalLabel}>Total Amount</ThemedText>
          <ThemedText style={styles.checkoutTotalValue}>
            Rs. {grandTotal.toLocaleString()}
          </ThemedText>
        </View>

        <TouchableOpacity
          style={styles.checkoutBtn}
          activeOpacity={0.85}
          onPress={handleCheckout}
        >
          <ThemedText style={styles.checkoutBtnText}>Proceed to Checkout</ThemedText>
          <ArrowRight size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerCount: {
    fontSize: 14,
    opacity: 0.6,
  },
  clearCartText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  /* Empty State */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 24,
    lineHeight: 20,
  },
  exploreBtn: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  /* Warning Banner */
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  warningText: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },

  /* Item Card */
  itemCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImage: {
    width: 90,
    height: 115,
    borderRadius: 10,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemBrand: {
    fontSize: 11,
    fontWeight: '800',
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  deleteBtn: {
    padding: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  stockBadge: {
    marginTop: 4,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priceStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 8,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperQty: {
    fontSize: 13,
    fontWeight: '800',
    minWidth: 16,
    textAlign: 'center',
  },

  /* Order Summary */
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginTop: 6,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13.5,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.15)',
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ff3b30',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    opacity: 0.8,
  },
  guaranteeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#10b981',
  },

  /* Fixed Bottom Checkout Bar */
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  checkoutTotalLabel: {
    fontSize: 11,
    opacity: 0.6,
    fontWeight: '600',
  },
  checkoutTotalValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  checkoutBtn: {
    backgroundColor: '#ff3b30',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
