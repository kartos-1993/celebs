import React from 'react';
import { ActivityIndicator, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { Product, useProducts } from '../hooks/use-products';

import { ProductCard } from './product-card';
import { styles } from './product-grid.styles';

import { ThemedText } from '@/components/themed-text';
import { Colors, Palette } from '@/constants/theme';

export interface ProductGridRef {
  loadMore: () => void;
}

interface ProductGridProps {
  onProductPress?: (product: Product) => void;
  loadMoreTrigger?: number;
  initialProducts?: Product[];
}

export const ProductGrid = React.forwardRef<ProductGridRef, ProductGridProps>(
  ({ onProductPress, loadMoreTrigger, initialProducts }, ref) => {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
    const {
      products: queryProducts,
      loading: queryLoading,
      loadingMore,
      hasMore,
      resultsCapped,
      loadMore,
      refetch,
    } = useProducts(10);

    const hasInitial = Boolean(initialProducts && initialProducts.length > 0);
    const products = queryProducts.length > 0 ? queryProducts : hasInitial ? initialProducts! : [];
    const loading = hasInitial && queryProducts.length === 0 ? false : queryLoading;

    React.useImperativeHandle(ref, () => ({
      loadMore,
    }));

    React.useEffect(() => {
      if (loadMoreTrigger && loadMoreTrigger > 0 && !loading && !loadingMore && hasMore) {
        loadMore();
      }
    }, [loadMoreTrigger, loading, loadingMore, hasMore, loadMore]);

    const handleRetry = React.useCallback(() => {
      refetch();
    }, [refetch]);

    return (
      <View style={styles.container}>
        {/* Section Title Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.titleWithIcon}>
            <Sparkles size={16} color={Palette.danger} />
            <ThemedText type="subtitle" style={styles.headerTitle}>
              Just For You
            </ThemedText>
          </View>
        </View>

        {/* 2-Column Dynamic Product Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <ThemedText type="small" style={styles.loadingText}>
              Fetching latest styles...
            </ThemedText>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyContainer}>
            {/* Inline opacity kept: product-grid.styles.ts is outside this
                stream's file list, so the key cannot be added here. */}
            <ThemedText style={{ opacity: 0.6 }}>No products found</ThemedText>{' '}
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry loading products"
            >
              <ThemedText style={styles.retryText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.gridWrapper}>
              {products.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={onProductPress}
                  isFirstCard={idx === 0}
                />
              ))}
            </View>

            {/* Infinite Scroll Bottom Spinner */}
            {loadingMore && (
              <View style={styles.paginationFooter}>
                <ActivityIndicator size="small" color={colors.text} />
              </View>
            )}

            {/* The page window is bounded, so a deeper catalog would otherwise
                look like the end of the list. Say it instead of truncating. */}
            {resultsCapped && !loadingMore && (
              <View style={styles.paginationFooter}>
                <ThemedText style={styles.loadMoreText}>
                  Showing the latest {products.length} styles — browse Explore for the full catalog
                </ThemedText>
              </View>
            )}
          </>
        )}
      </View>
    );
  },
);

ProductGrid.displayName = 'ProductGrid';
