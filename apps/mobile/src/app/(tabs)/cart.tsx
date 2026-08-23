import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, ShoppingBag } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { CartItemList } from '@/features/cart/components/cart-item-list';
import { CartSummaryFooter } from '@/features/cart/components/cart-summary-footer';
import { useCart } from '@/features/cart/context/cart-context';
import { styles } from '@/features/cart/styles/cart.styles';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    cart,
    loading,
    error: _error,
    subtotal,
    itemCount,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
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

  const handleRemove = async (itemId: string) => {
    setUpdatingId(itemId);
    try {
      await removeItem(itemId);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  if (loading && items.length === 0) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={Palette.brand} />
        <ThemedText style={styles.loadingText}>Loading Cart...</ThemedText>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShoppingBag size={48} color={Palette.gray500} />
          </View>
          <ThemedText style={styles.emptyTitle}>Your Cart is Empty</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            Looks like you haven't added any items to your shopping cart yet.
          </ThemedText>
          <TouchableOpacity
            style={styles.exploreBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)' as never)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Explore products"
          >
            <ThemedText style={styles.exploreBtnText}>Explore Products</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const shippingFee = subtotal >= 999 ? 0 : 150;
  const grandTotal = subtotal + shippingFee;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Clear Cart Header */}
        <View style={styles.headerRow}>
          <ThemedText style={styles.screenTitle}>Shopping Cart ({itemCount})</ThemedText>
          <TouchableOpacity onPress={() => clearCart()} activeOpacity={0.7}>
            <ThemedText style={styles.clearCartText}>Clear All</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Stock Warning Notice */}
        {hasStockIssues && (
          <View style={styles.stockNotice}>
            <AlertTriangle size={18} color={Palette.danger} />
            <ThemedText style={styles.stockNoticeText}>
              Some items in your cart have limited stock available.
            </ThemedText>
          </View>
        )}

        {/* Cart Item List */}
        <CartItemList
          items={items}
          updatingId={updatingId}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onRemove={handleRemove}
        />

        {/* Summary Footer */}
        <CartSummaryFooter
          subtotal={subtotal}
          shippingFee={shippingFee}
          grandTotal={grandTotal}
          onCheckout={handleCheckout}
        />
      </ScrollView>
    </ThemedView>
  );
}
