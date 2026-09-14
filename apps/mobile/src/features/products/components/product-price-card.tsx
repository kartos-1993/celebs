import React, { useState } from 'react';
import { LayoutAnimation, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Star } from 'lucide-react-native';

import { styles } from '../styles/product.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { useProductReviewSummary } from '@/features/reviews/hooks/use-reviews';

interface ProductPriceCardProps {
  productId?: string;
  name: string;
  price: number;
  discountedPrice?: number;
  onOpenReviews?: () => void;
}

export function ProductPriceCard({
  productId = '',
  name,
  price,
  discountedPrice,
  onOpenReviews,
}: ProductPriceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: summary } = useProductReviewSummary(productId);

  const currentPrice = discountedPrice || price;
  const hasDiscount = Boolean(discountedPrice && discountedPrice < price);
  const discountPercent = hasDiscount ? Math.round(((price - discountedPrice!) / price) * 100) : 0;

  const totalReviews = summary?.totalReviews != null ? Number(summary.totalReviews) : 0;
  const rawAvg = Number(summary?.averageRating ?? 0);
  const avgRating = !isNaN(rawAvg) && rawAvg > 0 ? rawAvg.toFixed(1) : '0.0';

  const handleToggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

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
        <TouchableOpacity
          style={styles.titleTouchable}
          onPress={handleToggleExpand}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Collapse product title' : 'Expand full product title'}
        >
          <ThemedText style={styles.productTitle} numberOfLines={isExpanded ? undefined : 2}>
            {name}
          </ThemedText>
        </TouchableOpacity>

        {totalReviews > 0 && (
          <TouchableOpacity
            style={styles.ratingInline}
            onPress={onOpenReviews}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Rated ${avgRating} stars with ${totalReviews} reviews. Tap to view reviews`}
          >
            <Star size={13} color={Palette.gold} fill={Palette.gold} />
            <ThemedText style={styles.ratingInlineText}>{avgRating}</ThemedText>
            <ThemedText style={styles.reviewsCount}>({totalReviews})</ThemedText>
            <ChevronRight size={13} color={Palette.gray400} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
