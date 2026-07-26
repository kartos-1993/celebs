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
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  ChevronDown,
  X,
  Check,
  Sparkles,
  Menu,
  Heart,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useProducts, Product } from '@/features/products/hooks/use-products';
import { ProductCard } from '@/features/products/components/product-card';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SubCategoryAvatar {
  name: string;
  image: string;
}

// Category-Specific Subcategory Circular Avatars with High-Res Image Thumbnails
const SUBCATEGORY_AVATARS_MAP: Record<string, SubCategoryAvatar[]> = {
  'denim-jeans': [
    { name: 'Long', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&q=80' },
    { name: 'Cropped', image: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=200&q=80' },
    { name: 'Extra Long', image: 'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=200&q=80' },
    { name: 'Capris', image: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=200&q=80' },
    { name: 'Soft', image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=200&q=80' },
  ],
  'shirts': [
    { name: 'Multicolor', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&q=80' },
    { name: 'Black & White', image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=200&q=80' },
    { name: 'Red & White', image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=200&q=80' },
    { name: 'Blue & White', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&q=80' },
    { name: 'Black', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=200&q=80' },
  ],
  't-shirts': [
    { name: 'Multicolor', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&q=80' },
    { name: 'Black & White', image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=200&q=80' },
    { name: 'Red & White', image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=200&q=80' },
    { name: 'Blue & White', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&q=80' },
    { name: 'Black', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=200&q=80' },
  ],
  'denim-jackets': [
    { name: 'Fleece', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&q=80' },
    { name: 'Oversized', image: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=200&q=80' },
    { name: 'Flap Pocket', image: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=200&q=80' },
    { name: 'Distressed', image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=200&q=80' },
    { name: 'Vintage', image: 'https://images.unsplash.com/photo-1525457136159-8878648a7ad0?w=200&q=80' },
  ],
  default: [
    { name: 'All', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&q=80' },
    { name: 'Casual', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&q=80' },
    { name: 'Streetwear', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=200&q=80' },
    { name: 'Classic', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=200&q=80' },
    { name: 'Oversized', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=200&q=80' },
  ],
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
  { label: 'Under Rs. 2500', min: 0, max: 2500 },
  { label: 'Rs. 2500 - Rs. 5000', min: 2500, max: 5000 },
  { label: 'Rs. 5000 - Rs. 10000', min: 5000, max: 10000 },
  { label: 'Over Rs. 10000', min: 10000, max: 999999 },
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
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const categorySlug = (Array.isArray(slug) ? slug[0] : slug) || 'denim-jeans';
  const categoryTitle = (Array.isArray(title) ? title[0] : title) || categorySlug.replace(/-/g, ' ').toUpperCase();

  // Search Query State
  const [searchQuery, setSearchQuery] = useState('');

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

  const avatarSubCats = SUBCATEGORY_AVATARS_MAP[categorySlug] || SUBCATEGORY_AVATARS_MAP.default;

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
    setSearchQuery('');
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

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }

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
        const variantColors = p.colorVariants?.map((v: any) => v.name.toLowerCase()) || [];
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
  }, [products, searchQuery, selectedSubCat, selectedColors, selectedFits, selectedStyles, selectedPriceRange, sortBy]);

  const openSpecificFilter = (section: 'color' | 'fit' | 'style' | 'size') => {
    setActiveFilterSection(section);
    setIsFilterDrawerOpen(true);
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" translucent={false} />

      {/* SINGLE HORIZONTAL TOP HEADER BAR */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 4,
            backgroundColor: '#ffffff',
            borderBottomColor: '#f2f2f7',
          },
        ]}
      >
        {/* Back Button (<) */}
        <TouchableOpacity style={styles.iconBtnCompact} activeOpacity={0.7} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Hamburger Menu Icon (☰) */}
        <TouchableOpacity style={styles.iconBtnCompact} activeOpacity={0.7} onPress={() => router.push('/explore')}>
          <Menu size={20} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>

        {/* Search Bar (TextInput + Search Icon Action Button) */}
        <View style={[styles.searchBarBox, { backgroundColor: '#f4f4f5' }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={`${categoryTitle}`}
            placeholderTextColor="#8e8e93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.searchActionBtn} activeOpacity={0.8}>
            <Search size={13} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Wishlist Heart Icon (♡) */}
        <TouchableOpacity style={styles.iconBtnCompact} activeOpacity={0.7}>
          <Heart size={20} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>

        {/* Shopping Cart Icon (🛒) */}
        <TouchableOpacity style={styles.iconBtnCompact} activeOpacity={0.7} onPress={() => router.push('/cart')}>
          <ShoppingCart size={20} color={colors.text} strokeWidth={2} />
          <View style={styles.cartBadge}>
            <ThemedText style={styles.cartBadgeText}>2</ThemedText>
          </View>
        </TouchableOpacity>
      </View>

      {/* CIRCULAR CATEGORY AVATARS HORIZONTAL SCROLL BAR */}
      <View style={[styles.avatarBarWrapper, { backgroundColor: '#ffffff' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarScrollContent}>
          {avatarSubCats.map((item) => {
            const isActive = selectedSubCat === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                activeOpacity={0.8}
                onPress={() => setSelectedSubCat(isActive ? 'All' : item.name)}
                style={styles.avatarItemContainer}
              >
                <View style={[styles.avatarCircle, isActive && styles.avatarCircleActive]}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                </View>
                <ThemedText style={[styles.avatarLabelText, isActive && styles.avatarLabelTextActive]} numberOfLines={1}>
                  {item.name}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* SORT & FILTER TOOLBAR (SHEIN STYLE) */}
      <View style={[styles.sortFilterBar, { backgroundColor: '#ffffff', borderBottomColor: '#f2f2f7' }]}>
        <TouchableOpacity style={styles.sortOptionTab} onPress={() => setIsSortModalOpen(true)}>
          <ThemedText style={styles.sortOptionLabel}>Recommended</ThemedText>
          <ChevronDown size={13} color={colors.text} style={{ marginLeft: 2 }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sortOptionTab} onPress={() => setSortBy('top_selling')}>
          <ThemedText style={[styles.sortOptionLabel, sortBy === 'top_selling' && styles.activeSortLabel]}>Most Popular</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sortOptionTab} onPress={() => setSortBy(sortBy === 'price_low' ? 'price_high' : 'price_low')}>
          <ThemedText style={styles.sortOptionLabel}>Price ⇅</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterBtnTab} onPress={() => { setActiveFilterSection('all'); setIsFilterDrawerOpen(true); }}>
          <ThemedText style={styles.filterTabLabel}>Filter 🗰</ThemedText>
          {activeFilterCount > 0 && (
            <View style={styles.activeFilterCountCircle}>
              <ThemedText style={styles.activeFilterCountText}>{activeFilterCount}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* SECONDARY FILTER TAG SCROLL BAR */}
      <View style={[styles.filterTagRow, { backgroundColor: '#ffffff' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTagScroll}>
          <View style={styles.purpleTrendsPill}>
            <Sparkles size={11} color="#7e22ce" />
            <ThemedText style={styles.purpleTrendsText}>Trends</ThemedText>
          </View>
          <TouchableOpacity style={styles.tagChipBtn} onPress={() => openSpecificFilter('color')}>
            <ThemedText style={styles.tagChipText}>Category ∨</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tagChipBtn} onPress={() => openSpecificFilter('size')}>
            <ThemedText style={styles.tagChipText}>Size ∨</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tagChipBtn} onPress={() => openSpecificFilter('color')}>
            <ThemedText style={styles.tagChipText}>Color ∨</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tagChipBtn} onPress={() => openSpecificFilter('fit')}>
            <ThemedText style={styles.tagChipText}>Fabric Elasticity ∨</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tagChipBtn} onPress={() => openSpecificFilter('fit')}>
            <ThemedText style={styles.tagChipText}>Fit Type ∨</ThemedText>
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
          <View style={[styles.sortModalCard, { backgroundColor: '#ffffff' }]}>
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
          <View style={[styles.drawerContentCard, { backgroundColor: '#ffffff' }]}>
            {/* Drawer Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: '#f3f4f6' }]}>
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
                            { backgroundColor: isSelected ? '#111827' : '#f4f4f5' },
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
                            { backgroundColor: isSelected ? '#111827' : '#f4f4f5' },
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
                            { backgroundColor: isSelected ? '#111827' : '#f4f4f5' },
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
                            { backgroundColor: isSelected ? '#111827' : '#f4f4f5' },
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
            <View style={[styles.drawerFooter, { borderTopColor: '#f3f4f6' }]}>
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
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    gap: 2,
  },
  iconBtnCompact: {
    padding: 5,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  searchBarBox: {
    flex: 1,
    height: 34,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 3,
    marginHorizontal: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 0,
    fontWeight: '500',
  },
  searchActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e63946',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '800',
  },

  /* Circular Category Avatars Row */
  avatarBarWrapper: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  avatarScrollContent: {
    paddingHorizontal: Spacing.four,
    gap: 14,
  },
  avatarItemContainer: {
    alignItems: 'center',
    width: 56,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#e4e4e7',
    backgroundColor: '#f4f4f5',
    marginBottom: 4,
  },
  avatarCircleActive: {
    borderColor: '#000000',
    borderWidth: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLabelText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#4b5563',
    textAlign: 'center',
  },
  avatarLabelTextActive: {
    fontWeight: '800',
    color: '#000000',
  },

  /* SHEIN Sort & Filter Toolbar */
  sortFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sortOptionTab: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#18181b',
  },
  activeSortLabel: {
    fontWeight: '800',
    color: '#000000',
  },
  filterBtnTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterTabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18181b',
  },
  activeFilterCountCircle: {
    backgroundColor: '#e63946',
    width: 15,
    height: 15,
    borderRadius: 7.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilterCountText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '800',
  },

  /* Secondary Tag Filter Row */
  filterTagRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  filterTagScroll: {
    paddingHorizontal: Spacing.four,
    gap: 6,
    alignItems: 'center',
  },
  purpleTrendsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  purpleTrendsText: {
    color: '#7e22ce',
    fontSize: 11,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  tagChipBtn: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3f3f46',
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
    paddingHorizontal: 6,
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
