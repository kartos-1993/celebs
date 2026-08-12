import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { Product,useProducts } from '../hooks/use-products';

import { ProductCard } from './product-card';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

export interface ProductGridRef {
  loadMore: () => void;
}

interface ProductGridProps {
  onProductPress?: (product: Product) => void;
  loadMoreTrigger?: number;
}

export const ProductGrid = React.forwardRef<ProductGridRef, ProductGridProps>(
  ({ onProductPress, loadMoreTrigger }, ref) => {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
    const { products, loading, loadingMore, hasMore, loadMore, refetch } = useProducts(10);

    React.useImperativeHandle(ref, () => ({
      loadMore,
    }));

    React.useEffect(() => {
      if (loadMoreTrigger && loadMoreTrigger > 0 && !loading && !loadingMore && hasMore) {
        loadMore();
      }
    }, [loadMoreTrigger, loading, loadingMore, hasMore, loadMore]);

    return (
      <View style={styles.container}>
        {/* Section Title Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.titleWithIcon}>
            <Sparkles size={18} color="#e63946" style={{ marginRight: 6 }} />
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
            <ThemedText style={{ opacity: 0.6 }}>No products found</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <ThemedText style={styles.retryText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.gridWrapper}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onPress={onProductPress} />
              ))}
            </View>

            {/* Infinite Scroll Bottom Spinner */}
            {loadingMore && (
              <View style={styles.paginationFooter}>
                <ActivityIndicator size="small" color={colors.text} />
              </View>
            )}
          </>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    marginTop: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
    paddingHorizontal: 2,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  filterBar: {
    paddingBottom: Spacing.three,
    gap: 6,
  },
  chipButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    marginRight: 4,
  },
  chipActive: {
    backgroundColor: '#000000',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    opacity: 0.6,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#208AEF',
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  paginationFooter: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
