import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import { Heart, ShoppingBag, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { Product, resolveImageUrl } from '../hooks/use-products';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 6;
const COLUMN_GAP = 6;
// Calculate width for 2-column grid with minimal 6px padding
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - COLUMN_GAP) / 2;

interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, onPress, onAddToCart }: ProductCardProps) {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const [isFavorite, setIsFavorite] = useState(false);

  // Get image URI from mainImages, dynamicData, uploadedAssets or colorVariants
  const primaryImage =
    product.mainImages?.[0] ||
    (product as any).dynamicData?.values?.mainImage?.[0] ||
    (product as any).dynamicData?.mainImage?.[0] ||
    (product as any).uploadedAssets?.mainImages?.[0] ||
    product.colorVariants?.[0]?.images?.[0] ||
    '';
  const imageUrl = resolveImageUrl(primaryImage);

  // Calculate discount percentage if original price is higher
  const hasDiscount = Boolean(product.discountedPrice && product.discountedPrice < product.price);
  const currentPrice = hasDiscount ? product.discountedPrice! : product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discountedPrice!) / product.price) * 100)
    : (product as any).discountPercent || 15;

  // Price text color: Apple System Warm Coral/Orange (#FF5000 / #FF9F0A) when discounted, standard theme color when regular price
  const priceColor = hasDiscount ? (isDark ? '#FF9F0A' : '#FF5000') : (isDark ? '#ffffff' : '#000000');

  // Format Price: Integer part & decimal part separately for e-commerce styling
  const integerPart = Math.floor(currentPrice);
  const decimalPart = (currentPrice % 1).toFixed(2).substring(1); // e.g. ".60" or ".00"

  // Brand / Store Name
  const storeName = product.brand || (product as any).vendorName || 'BODI';

  const handlePress = () => {
    if (onPress) {
      onPress(product);
    } else {
      router.push({
        pathname: '/product/[id]',
        params: { id: product._id },
      });
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.cardContainer, { width: CARD_WIDTH, backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}
      onPress={handlePress}
    >
      {/* 3:4 Aspect Ratio Image Container */}
      <View style={[styles.imageContainer, { backgroundColor: isDark ? '#2c2c2e' : '#f4f4f5' }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
            <ThemedText type="small" style={{ opacity: 0.4 }}>No Image</ThemedText>
          </View>
        )}

        {/* Wishlist Heart Button Top-Right */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.heartButton, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.85)' }]}
          onPress={() => setIsFavorite(!isFavorite)}
        >
          <Heart
            size={14}
            color={isFavorite ? '#ff3b30' : isDark ? '#ffffff' : '#1c1c1e'}
            fill={isFavorite ? '#ff3b30' : 'transparent'}
          />
        </TouchableOpacity>

        {/* Vertical Color Swatch Capsule Overlay (Bottom-Right of Image) */}
        {product.colorVariants && product.colorVariants.length > 0 && (
          <View style={styles.imageColorCapsule}>
            {product.colorVariants.slice(0, 3).map((variant, idx) => (
              <View
                key={idx}
                style={[
                  styles.capsuleColorDot,
                  { backgroundColor: variant.colorCode || '#8e8e93' }
                ]}
              />
            ))}
            <ThemedText style={styles.capsuleCountText}>
              {product.colorVariants.length}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Content Details */}
      <View style={styles.detailsContainer}>
        {/* Brand Badge Line (e.g. Trends | BODI >) */}
        <View style={styles.brandBadgeRow}>
          <View style={styles.trendsBadge}>
            <ThemedText style={styles.trendsText}>Trends</ThemedText>
          </View>
          <TouchableOpacity style={[styles.storeBadge, { backgroundColor: isDark ? '#3b0764' : '#faf5ff' }]} activeOpacity={0.7}>
            <ThemedText style={[styles.storeText, { color: isDark ? '#d8b4fe' : '#6b21a8' }]}>{storeName}</ThemedText>
            <ChevronRight size={9} color={isDark ? '#d8b4fe' : '#7c3aed'} />
          </TouchableOpacity>
        </View>

        {/* Product Title (Truncated to Single Line) */}
        <ThemedText numberOfLines={1} style={[styles.productName, { color: isDark ? '#f4f4f5' : '#27272a' }]}>
          {product.name}
        </ThemedText>

        {/* Bestseller / Ranking Tag (Orange/Gold) */}
        {product.featured ? (
          <TouchableOpacity activeOpacity={0.8} style={styles.bestsellerRow}>
            <ThemedText numberOfLines={1} style={styles.bestsellerText}>
              #1 Bestseller <ThemedText style={styles.bestsellerSub}>in Men Collection</ThemedText>
            </ThemedText>
            <ChevronRight size={10} color="#d97706" />
          </TouchableOpacity>
        ) : null}

        {/* Sales / New Arrival Row */}
        <View style={styles.salesRow}>
          <View style={[styles.newArrivalBadge, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
            <ThemedText style={[styles.newArrivalText, { color: isDark ? '#6ee7b7' : '#047857' }]}>NEW ARRIVAL</ThemedText>
          </View>
          <ThemedText style={[styles.soldText, { color: isDark ? '#a1a1aa' : '#71717a' }]}>80+ sold</ThemedText>
        </View>

        {/* Bottom 2-Column Price & Quick Add Row */}
        <View style={styles.bottomPriceRow}>
          {/* Column 1: Single Current Price + -xx% Discount Tag */}
          <View style={styles.priceLeftCol}>
            <View style={styles.mainPriceGroup}>
              <ThemedText style={[styles.currencySymbol, { color: priceColor }]}>Rs.</ThemedText>
              <ThemedText style={[styles.integerPrice, { color: priceColor }]}>{integerPart}</ThemedText>
              <ThemedText style={[styles.decimalPrice, { color: priceColor }]}>{decimalPart}</ThemedText>
            </View>

            {hasDiscount && (
              <View style={styles.discountTagPill}>
                <ThemedText style={styles.discountTagText}>-{discountPercent}%</ThemedText>
              </View>
            )}
          </View>

          {/* Column 2: Add to Cart Action Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.cartActionButton, { backgroundColor: isDark ? '#2c2c2e' : '#f4f4f5', borderColor: isDark ? '#3a3a3c' : '#e4e4e7' }]}
            onPress={() => onAddToCart?.(product)}
          >
            <ShoppingBag size={14} color={isDark ? '#ffffff' : '#1c1c1e'} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 8,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 25,
    height: 25,
    borderRadius: 12.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },

  /* Vertical Color Swatch Capsule Overlay (Tighter gap & larger dots) */
  imageColorCapsule: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 10,
    paddingHorizontal: 3.5,
    paddingVertical: 4,
    alignItems: 'center',
    gap: 2.5,
    zIndex: 5,
  },
  capsuleColorDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  capsuleCountText: {
    fontSize: 8,
    lineHeight: 9,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 1,
    textAlign: 'center',
  },

  /* Details Area */
  detailsContainer: {
    padding: 6,
    paddingTop: 4,
  },

  /* Brand Badge Row */
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  trendsBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderRadius: 2,
  },
  trendsText: {
    color: '#7e22ce',
    fontSize: 8,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderRadius: 2,
  },
  storeText: {
    fontSize: 8,
    fontWeight: '700',
  },

  /* Product Title */
  productName: {
    fontSize: 11.5,
    fontWeight: '400',
    lineHeight: 15,
    marginBottom: 2,
  },

  /* Bestseller Row */
  bestsellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 2,
  },
  bestsellerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#d97706',
  },
  bestsellerSub: {
    fontSize: 9,
    fontWeight: '500',
    color: '#b45309',
  },

  /* Sales / New Arrival Row */
  salesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  newArrivalBadge: {
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderRadius: 2,
  },
  newArrivalText: {
    fontSize: 7.5,
    fontWeight: '800',
  },
  soldText: {
    fontSize: 9,
    fontWeight: '500',
  },

  /* 2-Column Bottom Price & Add to Cart Row */
  bottomPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceLeftCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    flexWrap: 'nowrap',
    flex: 1,
    marginRight: 4,
  },
  mainPriceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 9.5,
    fontWeight: '800',
    marginRight: 1,
  },
  integerPrice: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  decimalPrice: {
    fontSize: 9.5,
    fontWeight: '800',
  },

  /* Compact Discount Percent Badge Pill Next to Price (Apple System Warm Coral #FF5000 / #FF9F0A) */
  discountTagPill: {
    backgroundColor: '#fff0ed',
    paddingHorizontal: 2.5,
    paddingVertical: 0.5,
    borderRadius: 2,
    marginLeft: 2,
  },
  discountTagText: {
    color: '#FF5000',
    fontSize: 7.5,
    lineHeight: 9,
    fontWeight: '800',
  },

  /* Cart Quick Add Button */
  cartActionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
