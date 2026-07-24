import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  useColorScheme,
  Modal,
  Pressable,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  ChevronDown,
  X,
  Check,
  Sparkles,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useProducts, Product } from '@/features/products/hooks/use-products';
import { ProductCard } from '@/features/products/components/product-card';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Subcategory Pills based on category
const SUB_CATEGORIES_MAP: Record<string, string[]> = {
  'denim-jeans': ['All', 'Wide Leg', 'Straight Leg', 'Loose Fit', 'Distressed/Ripped', 'Cargo', 'Light Wash', 'Dark Wash'],
  'denim-jackets': ['All', 'Fleece/Shearling', 'Oversized', 'Flap Pocket', 'Distressed', 'Vintage', 'Short', 'Ripped'],
  default: ['All', 'Top Selling', 'New Arrivals', 'Oversized', 'Casual', 'Streetwear', 'Classic'],
};

// Filter options definition
const COLOR_OPTIONS = [
  { name: 'Blue', code: '#2563eb' },
  { name: 'Light Wash', code: '#93c5fd' },
  { name: 'Dark Wash', code: '#1e3a8a' },
  { name: 'Black', code: '#18181b' },
  { name: 'Grey', code: '#71717a' },
  { name: 'Beige', code: '#d4b996' },
  { name: 'White', code: '#ffffff' },
  { name: 'Multicolor', code: 'gradient' },
];

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38'];
const FIT_OPTIONS = ['Loose', 'Oversized', 'Regular Fit', 'Slim Fit', 'Wide Leg', 'Straight Leg'];
const STYLE_OPTIONS = ['Streetwear', 'Vintage', 'Casual - Modern Casual', 'Avant-Garde', 'Amekaji'];
const DETAILS_OPTIONS = ['Pocket', 'Button', 'Zipper', 'Ripped', 'Distressed', 'Flap Pocket', 'Fleece Lined'];
const PRICE_RANGES = [
  { label: 'Under $25', min: 0, max: 25 },
  { label: '$25 - $50', min: 25, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: 'Over $100', min: 100, max: 9999 },
];

const SORT_OPTIONS = [
  { key: 'recommend', label: 'Recommend' },
  { key: 'top_selling', label: 'Top Selling' },
  { key: 'price_low', label: 'Price: Low to High' },
  { key: 'price_high', label: 'Price: High to Low' },
  { key: 'newest', label: 'New Arrivals' },
];

export default function CategoryProductsScreen() {
  const { slug, title } = useLocalSearchParams<{ slug: string; title?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const categorySlug = (Array.isArray(slug) ? slug[0] : slug) || 'denim-jeans';
  const categoryTitle = (Array.isArray(title) ? title[0] : title) || categorySlug.replace(/-/g, ' ').toUpperCase();

  // Fetch API products for category
  const { products, loading, loadingMore, hasMore, loadMore, refetch } = useProducts(20, categorySlug);

  // State for subcategory horizontal pill
  const [selectedSubCat, setSelectedSubCat] = useState('All');

  // Filter States
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedFits, setSelectedFits] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max: number } | null>(null);

  // Sort State
  const [sortBy, setSortBy] = useState('recommend');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);

  // Filter Drawer Modal State
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [activeFilterSection, setActiveFilterSection] = useState<'all' | 'color' | 'fit' | 'style' | 'size'>('all');

  const subCatList = SUB_CATEGORIES_MAP[categorySlug] || SUB_CATEGORIES_MAP.default;

  // Toggle helper
  const toggleSelection = (item: string, currentList: string[], setList: (val: string[]) => void) => {
    if (currentList.includes(item)) {
      setList(currentList.filter((i) => i !== item));
    } else {
      setList([...currentList, item]);
    }
  };

  const clearAllFilters = () => {
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedFits([]);
    setSelectedStyles([]);
    setSelectedDetails([]);
    setSelectedPriceRange(null);
    setSelectedSubCat('All');
  };

  const activeFilterCount =
    selectedColors.length +
    selectedSizes.length +
    selectedFits.length +
    selectedStyles.length +
    selectedDetails.length +
    (selectedPriceRange ? 1 : 0) +
    (selectedSubCat !== 'All' ? 1 : 0);

  // Computed & Filtered Products List
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Subcategory pill filter
    if (selectedSubCat !== 'All') {
      const term = selectedSubCat.toLowerCase();
      list = list.filter((p) => {
        const nameMatch = p.name?.toLowerCase().includes(term);
        const descMatch = p.description?.toLowerCase().includes(term);
        const dynMatch = JSON.stringify((p as any).dynamicData || {}).toLowerCase().includes(term);
        return nameMatch || descMatch || dynMatch;
      });
    }

    // Color filter
    if (selectedColors.length > 0) {
      list = list.filter((p) => {
        const variantColors = p.colorVariants?.map((v) => v.name.toLowerCase()) || [];
        return selectedColors.some((c) => variantColors.includes(c.toLowerCase()));
      });
    }

    // Fit filter
    if (selectedFits.length > 0) {
      list = list.filter((p) => {
        const dynFit = (p as any).dynamicData?.values?.fitType || '';
        return selectedFits.some((f) => dynFit.toLowerCase().includes(f.toLowerCase()) || p.name?.toLowerCase().includes(f.toLowerCase()));
      });
    }

    // Style filter
    if (selectedStyles.length > 0) {
      list = list.filter((p) => {
        const dynStyle = (p as any).dynamicData?.values?.style || '';
        return selectedStyles.some((s) => dynStyle.toLowerCase().includes(s.toLowerCase()));
      });
    }

    // Price range filter
    if (selectedPriceRange) {
      list = list.filter((p) => {
        const price = p.discountedPrice || p.price;
        return price >= selectedPriceRange.min && price <= selectedPriceRange.max;
      });
    }

    // Sorting logic
    if (sortBy === 'top_selling') {
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    } else if (sortBy === 'price_low') {
      list.sort((a, b) => (a.discountedPrice || a.price) - (b.discountedPrice || b.price));
    } else if (sortBy === 'price_high') {
      list.sort((a, b) => (b.discountedPrice || b.price) - (a.discountedPrice || a.price));
    } else if (sortBy === 'newest') {
      list.reverse();
    }

    return list;
  }, [products, selectedSubCat, selectedColors, selectedFits, selectedStyles, selectedPriceRange, sortBy]);

  const openSpecificFilter = (section: 'color' | 'fit' | 'style' | 'size') => {
    setActiveFilterSection(section);
    setIsFilterDrawerOpen(true);
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent={false} />

      {/* Sticky SHEIN Header */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 6,
            backgroundColor: isDark ? '#121212' : '#ffffff',
            borderBottomColor: isDark ? '#2c2c2e' : '#f2f2f7',
          },
        ]}
      >
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Title & Count */}
        <View style={styles.headerTitleCenter}>
          <ThemedText style={styles.headerCategoryTitle} numberOfLines={1}>
            {categoryTitle}
          </ThemedText>
          <ThemedText style={styles.headerSubtitleText}>
            {filteredProducts.length} Items
          </ThemedText>
        </View>

        {/* Right Actions */}
        <View style={styles.headerRightGroup}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => router.push('/explore')}>
            <Search size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => router.push('/cart')}>
            <ShoppingCart size={20} color={colors.text} strokeWidth={2} />
            <View style={styles.cartBadge}>
              <ThemedText style={styles.cartBadgeText}>2</ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Subcategory Pills Bar */}
      <View style={[styles.subCatBarWrapper, { backgroundColor: isDark ? '#1a1a1a' : '#fafafa' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subCatScrollContent}>
          {subCatList.map((item) => {
            const isActive = selectedSubCat === item;
            return (
              <TouchableOpacity
                key={item}
                activeOpacity={0.8}
                onPress={() => setSelectedSubCat(item)}
                style={[
                  styles.subCatPill,
                  isActive
                    ? styles.subCatPillActive
                    : { backgroundColor: isDark ? '#2c2c2e' : '#ffffff', borderColor: isDark ? '#3a3a3c' : '#e5e7eb' },
                ]}
              >
                <ThemedText style={[styles.subCatText, isActive && styles.subCatTextActive]}>
                  {item}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sticky Filter & Sort Toolbar */}
      <View style={[styles.filterToolbar, { backgroundColor: isDark ? '#18181b' : '#ffffff', borderBottomColor: isDark ? '#27272a' : '#e5e7eb' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterToolbarScroll}>
          {/* Sort Dropdown Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.toolbarChip, { backgroundColor: isDark ? '#27272a' : '#f4f4f5' }]}
            onPress={() => setIsSortModalOpen(true)}
          >
            <ThemedText style={styles.toolbarChipText}>
              {SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
            </ThemedText>
            <ChevronDown size={14} color={colors.text} style={{ marginLeft: 3 }} />
          </TouchableOpacity>

          {/* Quick Attribute Chips */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.toolbarChip, selectedColors.length > 0 && styles.toolbarChipSelected, { backgroundColor: selectedColors.length > 0 ? '#111827' : (isDark ? '#27272a' : '#f4f4f5') }]}
            onPress={() => openSpecificFilter('color')}
          >
            <ThemedText style={[styles.toolbarChipText, selectedColors.length > 0 && { color: '#ffffff' }]}>
              Color {selectedColors.length > 0 ? `(${selectedColors.length})` : ''}
            </ThemedText>
            <ChevronDown size={14} color={selectedColors.length > 0 ? '#ffffff' : colors.text} style={{ marginLeft: 3 }} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.toolbarChip, selectedFits.length > 0 && styles.toolbarChipSelected, { backgroundColor: selectedFits.length > 0 ? '#111827' : (isDark ? '#27272a' : '#f4f4f5') }]}
            onPress={() => openSpecificFilter('fit')}
          >
            <ThemedText style={[styles.toolbarChipText, selectedFits.length > 0 && { color: '#ffffff' }]}>
              Fit {selectedFits.length > 0 ? `(${selectedFits.length})` : ''}
            </ThemedText>
            <ChevronDown size={14} color={selectedFits.length > 0 ? '#ffffff' : colors.text} style={{ marginLeft: 3 }} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.toolbarChip, selectedSizes.length > 0 && styles.toolbarChipSelected, { backgroundColor: selectedSizes.length > 0 ? '#111827' : (isDark ? '#27272a' : '#f4f4f5') }]}
            onPress={() => openSpecificFilter('size')}
          >
            <ThemedText style={[styles.toolbarChipText, selectedSizes.length > 0 && { color: '#ffffff' }]}>
              Size {selectedSizes.length > 0 ? `(${selectedSizes.length})` : ''}
            </ThemedText>
            <ChevronDown size={14} color={selectedSizes.length > 0 ? '#ffffff' : colors.text} style={{ marginLeft: 3 }} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.toolbarChip, selectedStyles.length > 0 && styles.toolbarChipSelected, { backgroundColor: selectedStyles.length > 0 ? '#111827' : (isDark ? '#27272a' : '#f4f4f5') }]}
            onPress={() => openSpecificFilter('style')}
          >
            <ThemedText style={[styles.toolbarChipText, selectedStyles.length > 0 && { color: '#ffffff' }]}>
              Style {selectedStyles.length > 0 ? `(${selectedStyles.length})` : ''}
            </ThemedText>
            <ChevronDown size={14} color={selectedStyles.length > 0 ? '#ffffff' : colors.text} style={{ marginLeft: 3 }} />
          </TouchableOpacity>

          {/* Filter Drawer Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.filterDrawerBtn, activeFilterCount > 0 && styles.filterDrawerBtnActive]}
            onPress={() => {
              setActiveFilterSection('all');
              setIsFilterDrawerOpen(true);
            }}
          >
            <SlidersHorizontal size={14} color={activeFilterCount > 0 ? '#ffffff' : colors.text} />
            <ThemedText style={[styles.filterDrawerBtnText, activeFilterCount > 0 && { color: '#ffffff' }]}>
              Filter
            </ThemedText>
            {activeFilterCount > 0 && (
              <View style={styles.activeBadgeCircle}>
                <ThemedText style={styles.activeBadgeText}>{activeFilterCount}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Scrollable Product Feed */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 300) {
            loadMore();
          }
        }}
        scrollEventThrottle={200}
      >
        {/* Active Filter Tags Bar */}
        {activeFilterCount > 0 && (
          <View style={styles.activeTagsRow}>
            <TouchableOpacity style={styles.clearAllChip} onPress={clearAllFilters}>
              <ThemedText style={styles.clearAllText}>Clear All</ThemedText>
            </TouchableOpacity>
            {selectedColors.map((c) => (
              <View key={c} style={styles.tagBadge}>
                <ThemedText style={styles.tagText}>{c}</ThemedText>
                <TouchableOpacity onPress={() => toggleSelection(c, selectedColors, setSelectedColors)}>
                  <X size={12} color="#4b5563" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            ))}
            {selectedFits.map((f) => (
              <View key={f} style={styles.tagBadge}>
                <ThemedText style={styles.tagText}>{f}</ThemedText>
                <TouchableOpacity onPress={() => toggleSelection(f, selectedFits, setSelectedFits)}>
                  <X size={12} color="#4b5563" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* 2-Column Product Grid */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.text} />
            <ThemedText style={styles.loadingText}>Loading {categoryTitle}...</ThemedText>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyBox}>
            <ThemedText style={styles.emptyTitle}>No matching items found</ThemedText>
            <ThemedText style={styles.emptySub}>Try broadening your filters or selecting another category.</ThemedText>
            <TouchableOpacity style={styles.resetBtn} onPress={clearAllFilters}>
              <ThemedText style={styles.resetBtnText}>Reset All Filters</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {filteredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </View>
        )}

        {/* Loading More Spinner */}
        {loadingMore && (
          <View style={styles.loadingMoreBox}>
            <ActivityIndicator size="small" color={colors.text} />
          </View>
        )}
      </ScrollView>

      {/* SORT MODAL */}
      <Modal visible={isSortModalOpen} transparent animationType="fade" onRequestClose={() => setIsSortModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsSortModalOpen(false)}>
          <View style={[styles.sortModalCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
            <View style={styles.modalHeaderRow}>
              <ThemedText style={styles.modalHeaderTitle}>Sort By</ThemedText>
              <TouchableOpacity onPress={() => setIsSortModalOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {SORT_OPTIONS.map((opt) => {
              const isSelected = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.sortOptionRow}
                  onPress={() => {
                    setSortBy(opt.key);
                    setIsSortModalOpen(false);
                  }}
                >
                  <ThemedText style={[styles.sortOptionText, isSelected && styles.sortOptionTextSelected]}>
                    {opt.label}
                  </ThemedText>
                  {isSelected && <Check size={18} color="#e63946" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* FILTER DRAWER BOTTOM SHEET MODAL */}
      <Modal visible={isFilterDrawerOpen} transparent animationType="slide" onRequestClose={() => setIsFilterDrawerOpen(false)}>
        <View style={styles.drawerOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setIsFilterDrawerOpen(false)} />
          <View style={[styles.drawerContentCard, { backgroundColor: isDark ? '#18181b' : '#ffffff' }]}>
            {/* Drawer Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: isDark ? '#27272a' : '#f3f4f6' }]}>
              <TouchableOpacity onPress={clearAllFilters}>
                <ThemedText style={styles.drawerResetText}>Clear All</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.drawerTitle}>Filters</ThemedText>
              <TouchableOpacity onPress={() => setIsFilterDrawerOpen(false)}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Filter Content Scroll */}
            <ScrollView style={styles.drawerScrollBody} showsVerticalScrollIndicator={false}>
              {/* Color Section */}
              {(activeFilterSection === 'all' || activeFilterSection === 'color') && (
                <View style={styles.filterSection}>
                  <ThemedText style={styles.filterSectionTitle}>Color</ThemedText>
                  <View style={styles.colorGrid}>
                    {COLOR_OPTIONS.map((color) => {
                      const isSelected = selectedColors.includes(color.name);
                      return (
                        <TouchableOpacity
                          key={color.name}
                          style={[styles.colorItem, isSelected && styles.colorItemSelected]}
                          onPress={() => toggleSelection(color.name, selectedColors, setSelectedColors)}
                        >
                          <View
                            style={[
                              styles.colorCircle,
                              { backgroundColor: color.code === 'gradient' ? '#9333ea' : color.code },
                              color.name === 'White' && { borderWidth: 1, borderColor: '#d1d5db' },
                            ]}
                          >
                            {isSelected && <Check size={14} color={color.name === 'White' ? '#000000' : '#ffffff'} />}
                          </View>
                          <ThemedText style={styles.colorNameText}>{color.name}</ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Size Section */}
              {(activeFilterSection === 'all' || activeFilterSection === 'size') && (
                <View style={styles.filterSection}>
                  <ThemedText style={styles.filterSectionTitle}>Size</ThemedText>
                  <View style={styles.boxGrid}>
                    {SIZE_OPTIONS.map((sz) => {
                      const isSelected = selectedSizes.includes(sz);
                      return (
                        <TouchableOpacity
                          key={sz}
                          style={[
                            styles.boxChip,
                            isSelected && styles.boxChipSelected,
                            { backgroundColor: isSelected ? '#111827' : isDark ? '#27272a' : '#f4f4f5' },
                          ]}
                          onPress={() => toggleSelection(sz, selectedSizes, setSelectedSizes)}
                        >
                          <ThemedText style={[styles.boxChipText, isSelected && styles.boxChipTextSelected]}>
                            {sz}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Fit Type Section */}
              {(activeFilterSection === 'all' || activeFilterSection === 'fit') && (
                <View style={styles.filterSection}>
                  <ThemedText style={styles.filterSectionTitle}>Fit Type</ThemedText>
                  <View style={styles.boxGrid}>
                    {FIT_OPTIONS.map((fit) => {
                      const isSelected = selectedFits.includes(fit);
                      return (
                        <TouchableOpacity
                          key={fit}
                          style={[
                            styles.boxChip,
                            isSelected && styles.boxChipSelected,
                            { backgroundColor: isSelected ? '#111827' : isDark ? '#27272a' : '#f4f4f5' },
                          ]}
                          onPress={() => toggleSelection(fit, selectedFits, setSelectedFits)}
                        >
                          <ThemedText style={[styles.boxChipText, isSelected && styles.boxChipTextSelected]}>
                            {fit}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Style Section */}
              {(activeFilterSection === 'all' || activeFilterSection === 'style') && (
                <View style={styles.filterSection}>
                  <ThemedText style={styles.filterSectionTitle}>Style</ThemedText>
                  <View style={styles.boxGrid}>
                    {STYLE_OPTIONS.map((st) => {
                      const isSelected = selectedStyles.includes(st);
                      return (
                        <TouchableOpacity
                          key={st}
                          style={[
                            styles.boxChip,
                            isSelected && styles.boxChipSelected,
                            { backgroundColor: isSelected ? '#111827' : isDark ? '#27272a' : '#f4f4f5' },
                          ]}
                          onPress={() => toggleSelection(st, selectedStyles, setSelectedStyles)}
                        >
                          <ThemedText style={[styles.boxChipText, isSelected && styles.boxChipTextSelected]}>
                            {st}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Price Range Section */}
              {activeFilterSection === 'all' && (
                <View style={styles.filterSection}>
                  <ThemedText style={styles.filterSectionTitle}>Price Range</ThemedText>
                  <View style={styles.boxGrid}>
                    {PRICE_RANGES.map((pr) => {
                      const isSelected = selectedPriceRange?.min === pr.min && selectedPriceRange?.max === pr.max;
                      return (
                        <TouchableOpacity
                          key={pr.label}
                          style={[
                            styles.boxChip,
                            isSelected && styles.boxChipSelected,
                            { backgroundColor: isSelected ? '#111827' : isDark ? '#27272a' : '#f4f4f5' },
                          ]}
                          onPress={() => setSelectedPriceRange(isSelected ? null : { min: pr.min, max: pr.max })}
                        >
                          <ThemedText style={[styles.boxChipText, isSelected && styles.boxChipTextSelected]}>
                            {pr.label}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Drawer Bottom Apply Action */}
            <View style={[styles.drawerFooter, { borderTopColor: isDark ? '#27272a' : '#f3f4f6' }]}>
              <TouchableOpacity
                style={styles.drawerApplyBtn}
                activeOpacity={0.85}
                onPress={() => setIsFilterDrawerOpen(false)}
              >
                <ThemedText style={styles.drawerApplyBtnText}>
                  View {filteredProducts.length} Products
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerCategoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  headerSubtitleText: {
    fontSize: 11,
    color: '#8e8e93',
    fontWeight: '500',
    marginTop: 1,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#e63946',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },

  /* Subcategory Horizontal Pills */
  subCatBarWrapper: {
    paddingVertical: 8,
  },
  subCatScrollContent: {
    paddingHorizontal: Spacing.four,
    gap: 8,
  },
  subCatPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  subCatPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  subCatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  subCatTextActive: {
    color: '#ffffff',
  },

  /* Sticky Toolbar */
  filterToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterToolbarScroll: {
    paddingHorizontal: Spacing.four,
    gap: 8,
    alignItems: 'center',
  },
  toolbarChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toolbarChipSelected: {
    backgroundColor: '#111827',
  },
  toolbarChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterDrawerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    gap: 5,
  },
  filterDrawerBtnActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  filterDrawerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeBadgeCircle: {
    backgroundColor: '#e63946',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },

  /* Scroll Content & Grid */
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: 100,
  },
  activeTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.three,
  },
  clearAllChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
  },
  clearAllText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '700',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  tagText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#8e8e93',
  },
  loadingMoreBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sortModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sortOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortOptionTextSelected: {
    fontWeight: '800',
    color: '#e63946',
  },

  /* Drawer Modal */
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  drawerContentCard: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  drawerResetText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
  },
  drawerScrollBody: {
    padding: Spacing.four,
  },
  filterSection: {
    marginBottom: Spacing.five,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorItem: {
    alignItems: 'center',
    width: 64,
  },
  colorItemSelected: {
    opacity: 1,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorNameText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },

  boxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  boxChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  boxChipSelected: {
    backgroundColor: '#111827',
  },
  boxChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  boxChipTextSelected: {
    color: '#ffffff',
  },

  drawerFooter: {
    padding: Spacing.four,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.four,
  },
  drawerApplyBtn: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  drawerApplyBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
