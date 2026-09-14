import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { ProductCard } from '@/features/products/components/product-card';
import { WishlistEmptyState } from '@/features/wishlist/components/wishlist-empty-state';
import { WishlistHeader } from '@/features/wishlist/components/wishlist-header';
import { useWishlist, type WishlistEntryView } from '@/features/wishlist/hooks/use-wishlist';
import { styles } from '@/features/wishlist/styles/wishlist.styles';
import { toProduct } from '@/features/wishlist/utils/to-product';

export default function WishlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { entries, loading, refreshing, error, refresh } = useWishlist(isLoggedIn && !authLoading);

  const handleBack = useCallback(() => router.back(), [router]);
  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const renderContent = () => {
    if (authLoading || loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Palette.gray900} />
          <ThemedText style={styles.loadingText}>
            {authLoading ? 'Restoring session…' : 'Loading your wishlist…'}
          </ThemedText>
        </View>
      );
    }

    if (!isLoggedIn) {
      return (
        <WishlistEmptyState
          title="Sign in to save items"
          subtitle="Your wishlist is saved to your account. Log in to view and sync it."
          buttonLabel="Log In"
          onPress={() => router.push('/(tabs)/me')}
          accessibilityLabel="Go to login"
        />
      );
    }

    if (error) {
      return (
        <View style={styles.centerBox}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={handleRefresh}
            accessibilityRole="button"
            accessibilityLabel="Retry loading wishlist"
          >
            <ThemedText style={styles.retryBtnText}>Try Again</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    if (entries.length === 0) {
      return (
        <WishlistEmptyState
          title="Your Wishlist is Empty"
          subtitle="Tap the heart on any product to save it here for later."
          buttonLabel="Start Shopping"
          onPress={() => router.replace('/(tabs)' as never)}
          accessibilityLabel="Start shopping"
        />
      );
    }

    return (
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Palette.gray900}
          />
        }
        renderItem={({ item }: { item: WishlistEntryView }) => (
          <ProductCard product={toProduct(item)} />
        )}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <WishlistHeader topInset={insets.top} count={entries.length} onBack={handleBack} />
      {renderContent()}
    </ThemedView>
  );
}
