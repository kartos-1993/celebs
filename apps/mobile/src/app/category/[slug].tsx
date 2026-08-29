import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { CategorySearchHeader } from '@/features/categories/components/category-search-header';
import { DynamicFilterDrawer } from '@/features/categories/components/dynamic-filter-drawer';
import { QuickFilterRenderer } from '@/features/categories/components/quick-filter-renderer';
import { useCategoryFilters } from '@/features/categories/hooks/use-category-filters';
import { useStorefrontConfig } from '@/features/categories/hooks/use-storefront-config';
import { styles } from '@/features/categories/styles/category.styles';
import { ProductCard } from '@/features/products/components/product-card';
import { useProducts } from '@/features/products/hooks/use-products';

export default function CategoryProductsScreen() {
  const { slug, title } = useLocalSearchParams<{ slug: string; title?: string }>();
  const router = useRouter();
  const scheme = useColorScheme();

  const categorySlug = (Array.isArray(slug) ? slug[0] : slug) || '';
  const { storefrontConfig } = useStorefrontConfig(categorySlug);

  const categoryTitle =
    (Array.isArray(title) ? title[0] : title) ||
    storefrontConfig?.category?.name ||
    categorySlug.replace(/-/g, ' ').toUpperCase();

  const filters = useCategoryFilters(categorySlug);
  const { products, loading, loadingMore, hasMore, loadMore } = useProducts(filters.filterParams);

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      <CategorySearchHeader
        categoryTitle={categoryTitle}
        searchQuery={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        onBack={() => router.back()}
      />

      {storefrontConfig?.quickFilters?.map((qf, idx) => (
        <QuickFilterRenderer
          key={qf.id || idx}
          config={qf}
          selectedItem={filters.selectedQuickFilterValue}
          onSelectItem={filters.handleSelectQuickFilterItem}
        />
      ))}

      <View style={styles.actionBar}>
        <ThemedText style={styles.itemCountText}>{products.length} Items Found</ThemedText>

        <TouchableOpacity
          style={[styles.filterBtn, filters.activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => filters.setIsFilterDrawerOpen(true)}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Open Filters"
        >
          <SlidersHorizontal
            size={16}
            color={filters.activeFilterCount > 0 ? Palette.white : Palette.gray900}
          />
          <ThemedText
            style={[
              styles.filterBtnText,
              filters.activeFilterCount > 0 && styles.filterBtnTextActive,
            ]}
          >
            Filters {filters.activeFilterCount > 0 ? `(${filters.activeFilterCount})` : ''}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Palette.brand} />
          <ThemedText style={styles.loadingText}>Loading collection...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasMore && !loadingMore) loadMore();
          }}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => <ProductCard product={item} />}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={Palette.brand} />
              </View>
            ) : null
          }
        />
      )}

      <DynamicFilterDrawer
        isOpen={filters.isFilterDrawerOpen}
        onClose={() => filters.setIsFilterDrawerOpen(false)}
        drawerFilters={storefrontConfig?.drawerFilters}
        selectedColors={filters.selectedColors}
        onToggleColor={filters.handleToggleColor}
        selectedSizes={filters.selectedSizes}
        onToggleSize={filters.handleToggleSize}
        selectedFits={filters.selectedFits}
        onToggleFit={filters.handleToggleFit}
        selectedPriceRange={filters.selectedPriceRange}
        onSelectPriceRange={filters.setSelectedPriceRange}
        onReset={filters.handleResetFilters}
        totalFilteredCount={products.length}
      />
    </ThemedView>
  );
}
