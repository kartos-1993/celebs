import React from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ProductCard } from './product-card';
import { useProducts, Product } from '../hooks/use-products';

interface ProductGridProps {
  onProductPress?: (product: Product) => void;
}

const FILTER_CHIPS = ['All', 'Top Selling', 'New In', 'Super Savings', 'Sets'];

export function ProductGrid({ onProductPress }: ProductGridProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { products, loading, loadingMore, hasMore, loadMore } = useProducts(10);
  const [selectedFilter, setSelectedFilter] = React.useState('All');

  const filteredProducts = React.useMemo(() => {
    if (selectedFilter === 'Top Selling') {
      return products.filter((p) => p.featured);
    }
    if (selectedFilter === 'Super Savings') {
      return products.filter((p) => p.discountedPrice && p.discountedPrice < p.price);
    }
    if (selectedFilter === 'New In') {
      return [...products].reverse();
    }
    return products;
  }, [products, selectedFilter]);

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

      {/* SHEIN Horizontal Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {FILTER_CHIPS.map((chip) => {
          const isActive = selectedFilter === chip;
          return (
            <TouchableOpacity
              key={chip}
              activeOpacity={0.8}
              onPress={() => setSelectedFilter(chip)}
              style={[
                styles.chipButton,
                isActive
                  ? styles.chipActive
                  : { backgroundColor: scheme === 'dark' ? '#2c2c2e' : '#f2f2f7' },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  isActive ? styles.chipTextActive : { color: scheme === 'dark' ? '#d1d5db' : '#4b5563' },
                ]}
              >
                {chip}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 2-Column Dynamic Product Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
          <ThemedText type="small" style={styles.loadingText}>
            Fetching latest styles...
          </ThemedText>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={{ opacity: 0.6 }}>No products found</ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.gridWrapper}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onPress={onProductPress}
              />
            ))}
          </View>

          {/* Pagination Load More Button / Spinner */}
          {hasMore && (
            <View style={styles.paginationFooter}>
              {loadingMore ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.loadMoreButton,
                    { backgroundColor: scheme === 'dark' ? '#2c2c2e' : '#f2f2f7' }
                  ]}
                  onPress={loadMore}
                >
                  <ThemedText style={styles.loadMoreText}>Discover More</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
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
    paddingBottom: Spacing.four,
    gap: 8,
  },
  chipButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    marginRight: 6,
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
