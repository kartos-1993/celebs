import React from 'react';
import { View } from 'react-native';
import { ChevronRight, Star } from 'lucide-react-native';

import { styles } from '../styles/product.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ProductPriceCardProps {
  name: string;
  price: number;
  discountedPrice?: number;
}

export function ProductPriceCard({ name, price, discountedPrice }: ProductPriceCardProps) {
  const currentPrice = discountedPrice || price;
  const hasDiscount = Boolean(discountedPrice && discountedPrice < price);
  const discountPercent = hasDiscount ? Math.round(((price - discountedPrice!) / price) * 100) : 0;

  return (
    <View style={styles.detailsContainer}>
      <View style={styles.priceRow}>
        <ThemedText style={styles.currentPrice}>Rs. {currentPrice.toLocaleString()}</ThemedText>
        {hasDiscount && (
          <>
            <ThemedText style={styles.originalPrice}>Rs. {price.toLocaleString()}</ThemedText>
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>{discountPercent}% OFF</ThemedText>
            </View>
          </>
        )}
      </View>

      <View style={styles.titleRow}>
        <ThemedText style={styles.productTitle} numberOfLines={2}>
          {name}
        </ThemedText>
        <View style={styles.ratingInline}>
          <Star size={13} color={Palette.gold} fill={Palette.gold} />
          <ThemedText style={styles.ratingInlineText}>4.8</ThemedText>
          <ThemedText style={styles.reviewsCount}>(124)</ThemedText>
          <ChevronRight size={13} color={Palette.gray400} />
        </View>
      </View>
    </View>
  );
}
