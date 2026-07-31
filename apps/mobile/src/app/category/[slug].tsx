import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  useColorScheme,
  SafeAreaView,
  TextInput,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useProducts, Product } from '@/features/products/hooks/use-products';
import { ProductCard } from '@/features/products/components/product-card';
import { CategorySubcategoryAvatars } from '@/features/categories/components/CategorySubcategoryAvatars';
import { CategoryFilterDrawer } from '@/features/categories/components/CategoryFilterDrawer';

export default function CategoryProductsScreen() {
  const { slug, title } = useLocalSearchParams<{ slug: string; title?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();

  const categorySlug = (Array.isArray(slug) ? slug[0] : slug) || 'denim-jeans';
  const categoryTitle = (Array.isArray(title) ? title[0] : title) || categorySlug.replace(/-/g, ' ').toUpperCase();

  // Search Query State
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch API products for category
  const { products, loading, loadingMore, hasMore, loadMore } = useProducts(20, categorySlug);

  // Subcategory Selection State
  const [selectedSubCat, setSelectedSubCat] = useState('All');

  // Filter States
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedFits, setSelectedFits] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max: number } | null>(null);

  // Filter Drawer State
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Toggle Handlers
  const handleToggleColor = useCallback((colorName: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName]
    );
  }, []);

  const handleToggleSize = useCallback((size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }, []);

  const handleToggleFit = useCallback((fit: string) => {
    setSelectedFits((prev) =>
      prev.includes(fit) ? prev.filter((f) => f !== fit) : [...prev, fit]
    );
  }, []);

  const handleToggleStyle = useCallback((styleName: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleName) ? prev.filter((st) => st !== styleName) : [...prev, styleName]
    );
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedFits([]);
    setSelectedStyles([]);
    setSelectedPriceRange(null);
    setSelectedSubCat('All');
  }, []);

  // Filter & Search Logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesBrand = p.brand?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesBrand) return false;
      }

      if (selectedPriceRange) {
        const price = p.discountedPrice || p.price;
        if (price < selectedPriceRange.min || price > selectedPriceRange.max) {
          return false;
        }
      }

      return true;
    });
  }, [products, searchQuery, selectedPriceRange]);

  const activeFilterCount =
    selectedColors.length +
    selectedSizes.length +
    selectedFits.length +
    selectedStyles.length +
    (selectedPriceRange ? 1 : 0);

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#18181b" />
        </TouchableOpacity>

        {/* Search Bar Input */}
        <View style={styles.searchBar}>
          <Search size={16} color="#9ca3af" />
          <TextInput
            placeholder={`Search in ${categoryTitle}...`}
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity
          onPress={() => router.push('/cart')}
          style={styles.headerBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="View Cart"
        >
          <ShoppingCart size={22} color="#18181b" />
        </TouchableOpacity>
      </View>

      {/* Subcategory Circular Avatars Header */}
      <CategorySubcategoryAvatars
        slug={categorySlug}
        selectedSubcategory={selectedSubCat}
        onSelectSubcategory={setSelectedSubCat}
      />

      {/* Filter Control Action Bar */}
      <View style={styles.actionBar}>
        <ThemedText style={styles.itemCountText}>
          {filteredProducts.length} Items Found
        </ThemedText>

        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setIsFilterDrawerOpen(true)}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Open Filters"
        >
          <SlidersHorizontal size={16} color={activeFilterCount > 0 ? '#ffffff' : '#18181b'} />
          <ThemedText style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Main Product Grid Feed */}
      {loading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#208AEF" />
          <ThemedText style={styles.loadingText}>Loading collection...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          numColumns={2}
          keyExtractor={(item) => item._id}
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
                <ActivityIndicator size="small" color="#208AEF" />
              </View>
            ) : null
          }
        />
      )}

      {/* Filter Drawer Modal Sheet */}
      <CategoryFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        selectedColors={selectedColors}
        onToggleColor={handleToggleColor}
        selectedSizes={selectedSizes}
        onToggleSize={handleToggleSize}
        selectedFits={selectedFits}
        onToggleFit={handleToggleFit}
        selectedStyles={selectedStyles}
        onToggleStyle={handleToggleStyle}
        selectedPriceRange={selectedPriceRange}
        onSelectPriceRange={setSelectedPriceRange}
        onReset={handleResetFilters}
        totalFilteredCount={filteredProducts.length}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerBtn: {
    padding: 6,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#18181b',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  filterBtnActive: {
    backgroundColor: '#208AEF',
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#18181b',
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listContent: {
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
