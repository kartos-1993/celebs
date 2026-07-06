import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Pressable,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PRODUCTS, CATEGORIES } from '@/constants/mock-data';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  const featuredProducts = PRODUCTS.filter((p) => p.featured);

  const handleCategoryPress = (categoryName: string) => {
    router.push({
      pathname: '/explore',
      params: { category: categoryName },
    });
  };

  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}` as any);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.brandTitle}>CELEBS</ThemedText>
            <ThemedText style={styles.brandSubtitle} themeColor="textSecondary">
              FASHION MARKETPLACE
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              onPress={() => router.push('/wishlist' as any)}>
              <SymbolView
                name={{ ios: 'heart', android: 'favorite', web: 'favorite' }}
                size={22}
                tintColor={theme.text}
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              onPress={() => router.push('/cart' as any)}>
              <SymbolView
                name={{ ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }}
                size={22}
                tintColor={theme.text}
              />
            </Pressable>
          </View>
        </View>

        {/* Search Bar Button */}
        <Pressable
          style={({ pressed }) => [
            styles.searchButton,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/explore' as any)}>
          <SymbolView
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            size={18}
            tintColor={theme.textSecondary}
          />
          <ThemedText style={styles.searchText} themeColor="textSecondary">
            Search for clothing, shoes, accessories...
          </ThemedText>
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* Hero Banner */}
          <Pressable
            style={({ pressed }) => [styles.heroBanner, pressed && styles.pressed]}
            onPress={() => handleCategoryPress('Tops')}>
            <Image
              source="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1000"
              style={styles.heroImage}
              contentFit="cover"
            />
            <View style={styles.heroOverlay}>
              <View style={styles.heroGlassTag}>
                <ThemedText style={styles.heroTagText}>NEW COLLECTION</ThemedText>
              </View>
              <ThemedText style={styles.heroTitle}>Summer Essentials</ThemedText>
              <ThemedText style={styles.heroSubtitle}>Up to 30% Off Selected Styles</ThemedText>
            </View>
          </Pressable>

          {/* Categories Row */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Browse Categories</ThemedText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}
                onPress={() => handleCategoryPress(cat.name)}>
                <Image source={cat.image} style={styles.categoryImage} />
                <View style={styles.categoryNameOverlay}>
                  <ThemedText style={styles.categoryCardText}>{cat.name}</ThemedText>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {/* Featured Collection */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Trending Now</ThemedText>
            <Pressable onPress={() => router.push('/explore')}>
              <ThemedText style={styles.seeAllLink} type="linkPrimary">
                See All
              </ThemedText>
            </Pressable>
          </View>

          {/* Grid of Products */}
          <View style={styles.productGrid}>
            {featuredProducts.map((product) => {
              const originalPrice = product.price;
              const currentPrice = product.discountedPrice ?? product.price;
              const hasDiscount = !!product.discountedPrice;
              const discountPercent = hasDiscount
                ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
                : 0;

              return (
                <Pressable
                  key={product.id}
                  style={({ pressed }) => [
                    styles.productCard,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleProductPress(product.id)}>
                  <View style={styles.imageContainer}>
                    <Image
                      source={product.mainImages[0]}
                      style={styles.productImage}
                      contentFit="cover"
                      transition={200}
                    />
                    {hasDiscount && (
                      <View style={styles.discountBadge}>
                        <ThemedText style={styles.discountText}>-{discountPercent}%</ThemedText>
                      </View>
                    )}
                  </View>
                  <View style={styles.productDetails}>
                    <ThemedText style={styles.productBrand} themeColor="textSecondary">
                      {product.brand}
                    </ThemedText>
                    <ThemedText style={styles.productName} numberOfLines={1}>
                      {product.name}
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
                        size={12}
                        tintColor="#FFD700"
                      />
                      <ThemedText style={styles.ratingText} themeColor="textSecondary">
                        {product.rating} ({product.reviewsCount})
                      </ThemedText>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: -2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  iconButton: {
    padding: Spacing.one,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    marginHorizontal: Spacing.three,
    marginVertical: Spacing.two,
    gap: Spacing.two,
  },
  searchText: {
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  heroBanner: {
    height: 200,
    marginHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    overflow: 'hidden',
    marginTop: Spacing.two,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: Spacing.three,
  },
  heroGlassTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
    marginBottom: Spacing.one,
    backdropFilter: 'blur(10px)',
  },
  heroTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#E0E1E6',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesScroll: {
    paddingLeft: Spacing.three,
    gap: Spacing.two,
  },
  categoryCard: {
    width: 100,
    height: 100,
    borderRadius: Spacing.two,
    overflow: 'hidden',
    position: 'relative',
    marginRight: Spacing.two,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryNameOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  productCard: {
    width: '47%',
    borderRadius: Spacing.two,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  imageContainer: {
    height: 170,
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
    fontSize: 14,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 12,
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
    fontSize: 11,
  },
  pressed: {
    opacity: 0.85,
  },
});
