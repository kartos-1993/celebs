import React, { useState } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, ShoppingBag } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { CartCheckoutBar } from '@/features/cart/components/cart-checkout-bar';
import { CartHeader } from '@/features/cart/components/cart-header';
import { CartItemsSection } from '@/features/cart/components/cart-items-section';
import { CartPromoBanner } from '@/features/cart/components/cart-promo-banner';
import { useCart } from '@/features/cart/context/cart-context';
import { styles } from '@/features/cart/styles/cart.styles';
import { FREE_SHIPPING_THRESHOLD } from '@/features/cart/utils/cart-selectors';

// Mirrors TAB_BAR_CONTENT_HEIGHT in (tabs)/_layout.tsx
const TAB_BAR_CONTENT_HEIGHT = 56;

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    cart,
    loading,
    itemCount,
    selectedItems,
    selectedCount,
    selectedSubtotal,
    selectedOriginalSubtotal,
    selectedSavings,
    selectedSavingsPercent,
    isAllSelected,
    toggleAllSelection,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const items = cart?.items || [];
  const hasStockIssues = cart?.hasStockIssues || false;

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    setUpdatingId(itemId);
    try {
      await updateQuantity(itemId, quantity);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdatingId(itemId);
    try {
      await removeItem(itemId);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMore = () => {
    Alert.alert('Cart Options', undefined, [
      {
        text: 'Clear Cart',
        style: 'destructive',
        onPress: () => {
          clearCart();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
            Looks like you haven&apos;t added any items to your shopping cart yet.
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

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top }]}>
        <CartHeader
          variant="page"
          itemCount={itemCount}
          isAllSelected={isAllSelected}
          onToggleAll={toggleAllSelection}
          onMore={handleMore}
        />
        {hasStockIssues && (
          <View style={styles.stockNotice}>
            <AlertTriangle size={18} color={Palette.danger} />
            <ThemedText style={styles.stockNoticeText}>
              Some items in your cart have limited stock available.
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <CartItemsSection
          updatingId={updatingId}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          contentPaddingBottom={Spacing.md}
        />
      </View>

      {/* Padded above the absolute-positioned tab bar (56 content height, see (tabs)/_layout) */}
      <View
        style={[
          styles.footerGroup,
          { paddingBottom: insets.bottom + TAB_BAR_CONTENT_HEIGHT + Spacing.xs },
        ]}
      >
        <CartPromoBanner
          savings={selectedSavings}
          savingsPercent={selectedSavingsPercent}
          freeShippingRemaining={Math.max(0, FREE_SHIPPING_THRESHOLD - selectedSubtotal)}
        />
        <CartCheckoutBar
          itemCount={selectedCount}
          total={selectedSubtotal}
          originalTotal={selectedOriginalSubtotal}
          disabled={selectedItems.length === 0}
          onCheckout={handleCheckout}
        />
      </View>
    </ThemedView>
  );
}
