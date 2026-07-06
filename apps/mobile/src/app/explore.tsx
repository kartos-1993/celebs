import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Pressable,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PRODUCTS, Product } from '@/constants/mock-data';

export default function ExploreScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'priceAsc' | 'priceDesc'>('featured');

  // Sync category parameter from home screen navigation
  useEffect(() => {
    if (params.category && selectedCategory !== params.category) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCategory(params.category as string);
    }
  }, [params.category, selectedCategory]);

  const categories = useMemo(() => {
    return ['All', 'Tops', 'Bottoms', 'Shoes', 'Jackets'];
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...PRODUCTS];

    // Filter by Category
    if (selectedCategory !== 'All') {
      result = result.filter(
        (p) =>
          p.parentCategory.toLowerCase() === selectedCategory.toLowerCase() ||
          p.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by Search Query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort Results
    if (sortBy === 'priceAsc') {
      result.sort((a, b) => (a.discountedPrice ?? a.price) - (b.discountedPrice ?? b.price));
    } else if (sortBy === 'priceDesc') {
      result.sort((a, b) => (b.discountedPrice ?? b.price) - (a.discountedPrice ?? a.price));
    } else {
      // Sort by featured first, then rating
      result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating);
    }

    return result;
  }, [selectedCategory, searchQuery, sortBy]);

  const renderProductItem = ({ item }: { item: Product }) => {
    const originalPrice = item.price;
    const currentPrice = item.discountedPrice ?? item.price;
    const hasDiscount = !!item.discountedPrice;
    const discountPercent = hasDiscount
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : 0;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.productCard,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
        onPress={() => router.push(`/product/${item.id}` as any)}>
        <View style={styles.imageContainer}>
          <Image
            source={item.mainImages[0]}
            style={styles.productImage}
            contentFit="cover"
            transition={150}
          />
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>-{discountPercent}%</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.productDetails}>
          <ThemedText style={styles.productBrand} themeColor="textSecondary">
            {item.brand}
          </ThemedText>
          <ThemedText style={styles.productName} numberOfLines={1}>
            {item.name}
          </ThemedText>
          <View style={styles.priceRow}>
            <ThemedText style={styles.productPrice}>
              ${currentPrice.toFixed(2)}
            </ThemedText>
            {hasDiscount && (
              <ThemedText style={styles.originalPrice}>
                ${originalPrice.toFixed(2)}
              </ThemedText>
            )}
          </View>
          <View style={styles.ratingRow}>
            <SymbolView
              name={{ ios: 'star.fill', android: 'star', web: 'star' }}
              size={11}
              tintColor="#FFD700"
            />
            <ThemedText style={styles.ratingText} themeColor="textSecondary">
              {item.rating} ({item.reviewsCount})
            </ThemedText>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header Search Input */}
        <View style={styles.header}>
          <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement }]}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              size={18}
              tintColor={theme.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search catalog..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <SymbolView
                  name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                  size={16}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* Categories Chips */}
        <View style={styles.chipsWrapper}>
          <FlashList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            renderItem={({ item }) => {
              const isSelected = selectedCategory.toLowerCase() === item.toLowerCase();
              return (
                <Pressable
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? theme.text
                        : theme.backgroundElement,
                    },
                  ]}
                  onPress={() => setSelectedCategory(item)}>
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: isSelected ? theme.background : theme.text },
                    ]}>
                    {item}
                  </ThemedText>
                </Pressable>
              );
            }}
            contentContainerStyle={styles.chipsScroll}
          />
        </View>

        {/* Sort Controls Bar */}
        <View style={styles.controlsBar}>
          <ThemedText style={styles.resultsCount} themeColor="textSecondary">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} found
          </ThemedText>
          <View style={styles.sortButtons}>
            <Pressable
              style={[
                styles.sortButton,
                sortBy === 'featured' && { borderBottomColor: theme.text, borderBottomWidth: 2 },
              ]}
              onPress={() => setSortBy('featured')}>
              <ThemedText
                style={[styles.sortButtonText, sortBy === 'featured' && styles.activeSortText]}>
                Trending
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.sortButton,
                sortBy === 'priceAsc' && { borderBottomColor: theme.text, borderBottomWidth: 2 },
              ]}
              onPress={() => setSortBy('priceAsc')}>
              <ThemedText
                style={[styles.sortButtonText, sortBy === 'priceAsc' && styles.activeSortText]}>
                Price: Low
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.sortButton,
                sortBy === 'priceDesc' && { borderBottomColor: theme.text, borderBottomWidth: 2 },
              ]}
              onPress={() => setSortBy('priceDesc')}>
              <ThemedText
                style={[styles.sortButtonText, sortBy === 'priceDesc' && styles.activeSortText]}>
                Price: High
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Products Grid */}
        <View style={styles.gridContainer}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <SymbolView
                name={{ ios: 'exclamationmark.triangle', android: 'error', web: 'error' }}
                size={40}
                tintColor={theme.textSecondary}
              />
              <ThemedText style={styles.emptyTitle}>No Products Found</ThemedText>
              <ThemedText style={styles.emptySubtitle} themeColor="textSecondary">
                Try checking spelling or adjusting filters
              </ThemedText>
            </View>
          ) : (
            <FlashList
              data={filteredProducts}
              numColumns={2}
              renderItem={renderProductItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? Spacing.two : Spacing.one,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'normal',
    padding: 0,
  },
  chipsWrapper: {
    height: 48,
    marginVertical: Spacing.one,
  },
  chipsScroll: {
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
    justifyContent: 'center',
    marginRight: Spacing.one,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sortButton: {
    paddingVertical: Spacing.one,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#8A8A8F',
    fontWeight: '600',
  },
  activeSortText: {
    color: 'inherit',
  },
  gridContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.five,
  },
  productCard: {
    flex: 1,
    margin: Spacing.one,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 180,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    backgroundColor: '#FF3B30',
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  discountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  productDetails: {
    padding: Spacing.two,
    gap: 2,
  },
  productBrand: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 11,
    color: '#8A8A8F',
    textDecorationLine: 'line-through',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.three,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.85,
  },
});
