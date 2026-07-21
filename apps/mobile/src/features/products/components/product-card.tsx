import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import { Heart } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { Product, resolveImageUrl } from '../hooks/use-products';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Calculate width for 2-column grid with padding
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.four * 2 - Spacing.three) / 2;

interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const scheme = useColorScheme();
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
  const hasDiscount = product.discountedPrice && product.discountedPrice < product.price;
  const currentPrice = hasDiscount ? product.discountedPrice! : product.price;
  const originalPrice = hasDiscount ? product.price : null;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discountedPrice!) / product.price) * 100)
    : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.cardContainer, { width: CARD_WIDTH, backgroundColor: scheme === 'dark' ? '#1c1c1e' : '#ffffff' }]}
      onPress={() => onPress?.(product)}
    >
      {/* 3:4 Aspect Ratio Image Container */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: scheme === 'dark' ? '#2c2c2e' : '#f2f2f7' }]}>
            <ThemedText type="small" style={{ opacity: 0.4 }}>No Image</ThemedText>
          </View>
        )}

        {/* Top Seller / NEW Badge Pill */}
        {product.featured ? (
          <View style={styles.topSellerBadge}>
            <ThemedText style={styles.topSellerText}>Top Seller</ThemedText>
          </View>
        ) : hasDiscount ? (
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>-{discountPercent}%</ThemedText>
          </View>
        ) : null}

        {/* Wishlist Heart Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.heartButton}
          onPress={() => setIsFavorite(!isFavorite)}
        >
          <Heart
            size={16}
            color={isFavorite ? '#ff3b30' : '#1c1c1e'}
            fill={isFavorite ? '#ff3b30' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {/* Content Details */}
      <View style={styles.detailsContainer}>
        {/* Brand / Name */}
        <ThemedText numberOfLines={2} style={styles.productName}>
          {product.name}
        </ThemedText>

        {/* Price Row */}
        <View style={styles.priceRow}>
          <ThemedText style={styles.currentPrice}>
            ${currentPrice.toFixed(2)}
          </ThemedText>
          {originalPrice && (
            <ThemedText style={styles.originalPrice}>
              ${originalPrice.toFixed(2)}
            </ThemedText>
          )}
        </View>

        {/* SHEIN Rating Stars & Reviews */}
        <View style={styles.ratingRow}>
          <ThemedText style={styles.starIcon}>★</ThemedText>
          <ThemedText style={styles.ratingText}>4.9</ThemedText>
          <ThemedText style={styles.reviewCountText}>(1.2k+)</ThemedText>
        </View>

        {/* Color Swatch Dots */}
        {product.colorVariants && product.colorVariants.length > 0 && (
          <View style={styles.colorRow}>
            {product.colorVariants.slice(0, 4).map((variant, idx) => (
              <View
                key={idx}
                style={[
                  styles.colorDot,
                  { backgroundColor: variant.colorCode || '#8e8e93' }
                ]}
              />
            ))}
            {product.colorVariants.length > 4 && (
              <ThemedText style={styles.moreColorsText}>
                +{product.colorVariants.length - 4}
              </ThemedText>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 12,
    marginBottom: Spacing.four,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    position: 'relative',
    backgroundColor: '#f2f2f7',
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
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#e63946',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 5,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  topSellerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ffb703',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 5,
  },
  topSellerText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  promoTagContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff0f3',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    marginBottom: 4,
  },
  promoTagText: {
    color: '#e63946',
    fontSize: 9,
    fontWeight: '700',
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  detailsContainer: {
    padding: 8,
  },
  productName: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  currentPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#e63946',
  },
  originalPrice: {
    fontSize: 11,
    color: '#8e8e93',
    textDecorationLine: 'line-through',
  },
  miniDiscountTag: {
    backgroundColor: '#fff0f3',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  miniDiscountText: {
    color: '#e63946',
    fontSize: 9,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  starIcon: {
    fontSize: 11,
    color: '#ffb703',
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reviewCountText: {
    fontSize: 10,
    color: '#8e8e93',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  moreColorsText: {
    fontSize: 10,
    color: '#8e8e93',
    marginLeft: 2,
  },
});
