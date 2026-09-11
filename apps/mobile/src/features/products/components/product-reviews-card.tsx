import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ChevronRight, Star } from 'lucide-react-native';

import { styles } from '../styles/product-reviews-card.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { FitSpectrumBar } from '@/features/reviews/components/fit-spectrum-bar';
import { ProductReviewsSheet } from '@/features/reviews/components/product-reviews-sheet';
import { StarRating } from '@/features/reviews/components/star-rating';
import { useProductReviews, useProductReviewSummary } from '@/features/reviews/hooks/use-reviews';
import type { ReviewGalleryItem } from '@/features/reviews/types';

interface ProductReviewsCardProps {
  productId?: string;
  onBuyTheSame?: (variant: { color?: string | null; size?: string | null }) => void;
  onAddToCart?: (item: ReviewGalleryItem) => void;
}

const SENTIMENT_CHIPS = ['True to Picture', 'Good Quality', 'Fast Shipping'];

export function ProductReviewsCard({
  productId = '',
  onBuyTheSame,
  onAddToCart,
}: ProductReviewsCardProps) {
  const [sheetVisible, setSheetVisible] = useState(false);

  const { data: summary } = useProductReviewSummary(productId);
  const { data: reviews = [] } = useProductReviews(productId, 1, 3);

  const avgRating = summary?.averageRating ? summary.averageRating.toFixed(1) : '4.8';
  const totalCount = summary?.totalReviews ?? reviews.length;
  const previewReviews = reviews.slice(0, 2);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.scoreRow}>
          <ThemedText style={styles.scoreText}>{avgRating}</ThemedText>
          <Star size={15} color={Palette.gold ?? '#F59E0B'} fill={Palette.gold ?? '#F59E0B'} />
          <ThemedText style={styles.countText}>({totalCount} reviews)</ThemedText>
        </View>
        <TouchableOpacity
          style={styles.viewMoreBtn}
          onPress={() => setSheetVisible(true)}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.viewMoreText}>View more</ThemedText>
          <ChevronRight size={14} color={Palette.gray600} />
        </TouchableOpacity>
      </View>

      {summary?.fitDistribution && <FitSpectrumBar fitDistribution={summary.fitDistribution} />}

      <View style={styles.chipsRow}>
        {SENTIMENT_CHIPS.map((chip, idx) => (
          <View key={idx} style={styles.chip}>
            <ThemedText style={styles.chipText}>{chip}</ThemedText>
          </View>
        ))}
      </View>

      {previewReviews.length > 0 ? (
        <View style={styles.previewReviewsContainer}>
          {previewReviews.map((rev) => {
            const variantStr = [rev.colorVariantName, rev.size].filter(Boolean).join(' / ');
            return (
              <View key={rev.id} style={styles.previewItem}>
                <View style={styles.previewHeader}>
                  <ThemedText style={styles.previewUser}>{rev.userName}</ThemedText>
                  {!!variantStr && (
                    <ThemedText style={styles.previewVariant}>{variantStr}</ThemedText>
                  )}
                </View>
                <StarRating rating={rev.rating} size={11} />
                <ThemedText numberOfLines={2} style={styles.previewComment}>
                  {rev.comment}
                </ThemedText>
              </View>
            );
          })}
        </View>
      ) : (
        <ThemedText style={styles.emptyText}>
          No reviews yet — be the first to review this product after purchase!
        </ThemedText>
      )}

      <ProductReviewsSheet
        visible={sheetVisible}
        productId={productId}
        onClose={() => setSheetVisible(false)}
        onBuyTheSame={onBuyTheSame}
        onAddToCart={onAddToCart}
      />
    </View>
  );
}
