import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { ShoppingBag, ThumbsUp } from 'lucide-react-native';

import { useToggleReviewLikeMutation } from '../hooks/use-reviews';
import { styles } from '../styles/review-gallery-modal.styles';
import type { ReviewGalleryItem } from '../types';

import { StarRating } from './star-rating';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ReviewGalleryDetailsProps {
  item: ReviewGalleryItem;
  bottomInset: number;
  onAddToCart?: (item: ReviewGalleryItem) => void;
}

export const ReviewGalleryDetails = React.memo(function ReviewGalleryDetails({
  item,
  bottomInset,
  onAddToCart,
}: ReviewGalleryDetailsProps) {
  const [isLiked, setIsLiked] = useState(!!item.isLikedByMe);
  const [helpfulCount, setHelpfulCount] = useState(item.helpfulCount);
  const toggleLikeMutation = useToggleReviewLikeMutation();

  const variantText = [item.colorVariantName, item.size].filter(Boolean).join(' / ');

  const handleToggleLike = () => {
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? helpfulCount + 1 : Math.max(0, helpfulCount - 1);
    setIsLiked(nextLiked);
    setHelpfulCount(nextCount);

    toggleLikeMutation.mutate(item.reviewId, {
      onError: () => {
        setIsLiked(!nextLiked);
        setHelpfulCount(helpfulCount);
      },
    });
  };

  return (
    <View style={[styles.bottomCard, { paddingBottom: bottomInset + 12 }]}>
      <View style={styles.userRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemedText style={styles.userName}>{item.userName}</ThemedText>
          <StarRating rating={item.rating} size={12} />
        </View>

        <TouchableOpacity
          style={[styles.galleryHelpfulBtn, isLiked && styles.galleryHelpfulBtnActive]}
          onPress={handleToggleLike}
          activeOpacity={0.7}
        >
          <ThumbsUp
            size={11}
            color={isLiked ? Palette.white : Palette.gray300}
            fill={isLiked ? Palette.white : 'none'}
          />
          <ThemedText style={isLiked ? styles.galleryHelpfulTextActive : styles.galleryHelpfulText}>
            {helpfulCount}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {!!variantText && <ThemedText style={styles.variantText}>{variantText}</ThemedText>}

      <ScrollView
        style={styles.scrollableComment}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.commentText}>{item.comment}</ThemedText>
      </ScrollView>

      {!!onAddToCart && (
        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => onAddToCart(item)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ShoppingBag size={15} color={Palette.gray900} />
            <ThemedText style={styles.cartBtnText}>Add to Cart</ThemedText>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
});
