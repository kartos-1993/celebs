import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Search, ShoppingCart, SlidersHorizontal } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useCartSheet } from '@/features/cart/context/cart-sheet-context';
import { DynamicFilterDrawer } from '@/features/categories/components/dynamic-filter-drawer';
import { QuickFilterRenderer } from '@/features/categories/components/quick-filter-renderer';
import { useStorefrontConfig } from '@/features/categories/hooks/use-storefront-config';
import { styles } from '@/features/categories/styles/category.styles';
import { QuickFilterItem } from '@/features/categories/types';
import { ProductCard } from '@/features/products/components/product-card';
import { useProducts } from '@/features/products/hooks/use-products';

export default function CategoryProductsScreen() {
  const { slug, title } = useLocalSearchParams<{ slug: string; title?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const { openCartSheet } = useCartSheet();

  const categorySlug = (Array.isArray(slug) ? slug[0] : slug) || '';

  // Fetch dynamic storefront config from API
  const { storefrontConfig } = useStorefrontConfig(categorySlug);

  const categoryTitle =
    (Array.isArray(title) ? title[0] : title) ||
    storefrontConfig?.category?.name ||
    categorySlug.replace(/-/g, ' ').toUpperCase();

  // Search Query State
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch API products for category
  const { products, loading, loadingMore, hasMore, loadMore } = useProducts(20, categorySlug);

  // Quick Filter Selection State
  const [selectedQuickFilterValue, setSelectedQuickFilterValue] = useState<string | null>(null);

  // Filter States
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedFits, setSelectedFits] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max: number } | null>(
    null,
  );

  // Filter Drawer State
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Quick Filter Item Selection Handler
  const handleSelectQuickFilterItem = useCallback((item: QuickFilterItem) => {
    const val = item.filterValue || item.slug || item.name;
    setSelectedQuickFilterValue((prev) => (prev === val ? null : val));
  }, []);

  // Toggle Handlers
  const handleToggleColor = useCallback((colorName: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName],
    );
  }, []);

  const handleToggleSize = useCallback((size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  }, []);

  const handleToggleFit = useCallback((fit: string) => {
    setSelectedFits((prev) =>
      prev.includes(fit) ? prev.filter((f) => f !== fit) : [...prev, fit],
    );
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedFits([]);
    setSelectedPriceRange(null);
    setSelectedQuickFilterValue(null);
  }, []);

  // Filter & Search Logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesBrand = p.brand?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesBrand) return false;
      }

      // 2. Quick Filter subcategory / tag matching
      if (selectedQuickFilterValue) {
        const valLower = selectedQuickFilterValue.toLowerCase();
        const matchesSubcat =
          p.subcategory && String(p.subcategory).toLowerCase().includes(valLower);
        const matchesName = p.name.toLowerCase().includes(valLower);
        const matchesTags =
          Array.isArray(p.tags) && p.tags.some((t: string) => t.toLowerCase() === valLower);
        if (!matchesSubcat && !matchesName && !matchesTags) return false;
      }

      // 3. Price filter
      if (selectedPriceRange) {
        const price = p.discountedPrice || p.price;
        if (price < selectedPriceRange.min || price > selectedPriceRange.max) {
          return false;
        }
      }

      return true;
    });
  }, [products, searchQuery, selectedQuickFilterValue, selectedPriceRange]);

  const activeFilterCount =
    selectedColors.length +
    selectedSizes.length +
    selectedFits.length +
    (selectedPriceRange ? 1 : 0) +
    (selectedQuickFilterValue ? 1 : 0);

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={Palette.gray900} />
        </TouchableOpacity>

        {/* Search Bar Input */}
        <View style={styles.searchBar}>
          <Search size={16} color={Palette.gray400} />
          <TextInput
            placeholder={`Search in ${categoryTitle}...`}
            placeholderTextColor={Palette.gray400}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity
          onPress={openCartSheet}
          style={styles.headerBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="View Cart"
        >
          <ShoppingCart size={22} color={Palette.gray900} />
        </TouchableOpacity>
      </View>

      {/* Dynamic Storefront Quick Filters Header */}
      {storefrontConfig?.quickFilters?.map((qf, idx) => (
        <QuickFilterRenderer
          key={qf.id || idx}
          config={qf}
          selectedItem={selectedQuickFilterValue}
          onSelectItem={handleSelectQuickFilterItem}
        />
      ))}

      {/* Filter Control Action Bar */}
      <View style={styles.actionBar}>
        <ThemedText style={styles.itemCountText}>{filteredProducts.length} Items Found</ThemedText>

        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setIsFilterDrawerOpen(true)}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Open Filters"
        >
          <SlidersHorizontal
            size={16}
            color={activeFilterCount > 0 ? Palette.white : Palette.gray900}
          />
          <ThemedText
            style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}
          >
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Main Product Grid Feed */}
      {loading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Palette.brand} />
          <ThemedText style={styles.loadingText}>Loading collection...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
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

      {/* Dynamic Filter Drawer Modal Sheet */}
      <DynamicFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        drawerFilters={storefrontConfig?.drawerFilters}
        selectedColors={selectedColors}
        onToggleColor={handleToggleColor}
        selectedSizes={selectedSizes}
        onToggleSize={handleToggleSize}
        selectedFits={selectedFits}
        onToggleFit={handleToggleFit}
        selectedPriceRange={selectedPriceRange}
        onSelectPriceRange={setSelectedPriceRange}
        onReset={handleResetFilters}
        totalFilteredCount={filteredProducts.length}
      />
    </ThemedView>
  );
}
