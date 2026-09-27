import React, { useCallback, useState } from 'react';
import { LayoutAnimation, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Star } from 'lucide-react-native';

import { validDiscount } from '@celebs/shared-utils';

import { styles } from '../styles/product.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { useProductReviewSummary } from '@/features/reviews/hooks/use-reviews';

interface ProductPriceCardProps {
  productId?: string;
  name: string;
  price: number;
  discountedPrice?: number;
  /**
   * True when `price` is the low end of a range (no size chosen) rather than a
   * single SKU figure — rendered as "from {price}" instead of quoting the
   * cheapest size as if it were the only price.
   */
  isRange?: boolean;
  onOpenReviews?: () => void;
}

/** A dash for anything that is not a finite number, so NaN never reaches the UI. */
function formatAmount(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';
}

export function ProductPriceCard({
  productId = '',
  name,
  price,
  discountedPrice,
  isRange = false,
  onOpenReviews,
}: ProductPriceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: summary } = useProductReviewSummary(productId);

  // Single shared discount choke point: an above-list, zero, NaN or absent
  // discountedPrice can never render as a deal or inflate the current price.
  const deal = validDiscount(price, discountedPrice);
  const currentPrice = deal ?? (Number.isFinite(price) ? price : 0);
  const hasDiscount = deal !== undefined;
  const discountPercent = hasDiscount && price > 0 ? Math.round(((price - deal) / price) * 100) : 0;

  const totalReviews = summary?.totalReviews != null ? Number(summary.totalReviews) : 0;
  const rawAvg = Number(summary?.averageRating ?? 0);
  const avgRating = !isNaN(rawAvg) && rawAvg > 0 ? rawAvg.toFixed(1) : '0.0';

  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <View style={styles.detailsContainer}>
      <View style={styles.priceRow}>
        <ThemedText style={styles.currentPrice}>
          {isRange ? 'from ' : ''}Rs. {formatAmount(currentPrice)}
        </ThemedText>
        {hasDiscount && (
          <>
            <ThemedText style={styles.originalPrice}>Rs. {formatAmount(price)}</ThemedText>
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
