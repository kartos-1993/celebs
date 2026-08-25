import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Heart } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { ProductCard } from '@/features/products/components/product-card';
import type { Product } from '@/features/products/hooks/use-products';
import { useWishlist, type WishlistEntryView } from '@/features/wishlist/hooks/use-wishlist';
import { styles } from '@/features/wishlist/styles/wishlist.styles';

function toProduct(entry: WishlistEntryView): Product {
  return {
    id: entry.product.id,
    name: entry.product.name || 'Product',
    ...(entry.product.brand ? { brand: entry.product.brand } : {}),
    price: entry.product.price,
    ...(entry.product.discountedPrice ? { discountedPrice: entry.product.discountedPrice } : {}),
    mainImages: entry.product.mainImages,
    status: 'published',
  };
}

export default function WishlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const { entries, loading, refreshing, error, refresh } = useWishlist(isLoggedIn);

  const Header = (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <TouchableOpacity
        style={styles.headerIconSlot}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={24} color={Palette.gray900} />
      </TouchableOpacity>
      <ThemedText style={styles.headerTitle}>
        My Wishlist{entries.length > 0 ? ` (${entries.length})` : ''}
      </ThemedText>
      <View style={styles.headerIconSlot} />
    </View>
  );

  if (!isLoggedIn || loading) {
    return (
      <ThemedView style={styles.container}>
        {Header}
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Palette.gray900} />
          <ThemedText style={styles.loadingText}>Loading your wishlist…</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        {Header}
        <View style={styles.centerBox}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void refresh()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading wishlist"
          >
            <ThemedText style={styles.retryBtnText}>Try Again</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  if (entries.length === 0) {
    return (
      <ThemedView style={styles.container}>
        {Header}
        <View style={styles.centerBox}>
          <View style={styles.emptyIconCircle}>
            <Heart size={36} color={Palette.gray400} strokeWidth={1.6} />
          </View>
          <ThemedText style={styles.emptyTitle}>Your Wishlist is Empty</ThemedText>
          <ThemedText style={styles.emptySub}>
            Tap the heart on any product to save it here for later.
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
      {Header}
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Palette.gray900} />
        }
        renderItem={({ item }) => <ProductCard product={toProduct(item)} />}
      />
    </ThemedView>
  );
}
