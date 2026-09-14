import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, ShoppingBag, ThumbsUp } from 'lucide-react-native';

import { useToggleReviewLikeMutation } from '../hooks/use-reviews';
import { styles } from '../styles/product-reviews-sheet.styles';
import type { ReviewItem } from '../types';

import { StarRating } from './star-rating';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { formatDate } from '@/features/orders/utils/order-status';

interface ProductReviewItemProps {
  item: ReviewItem;
  onBuyTheSame?: (variant: { color?: string | null; size?: string | null }) => void;
  onOpenPhoto: (review: ReviewItem, photoIndex: number) => void;
}

export const ProductReviewItem = React.memo(function ProductReviewItem({
  item,
  onBuyTheSame,
  onOpenPhoto,
}: ProductReviewItemProps) {
  const [isLiked, setIsLiked] = useState(!!item.isLikedByMe);
  const [helpfulCount, setHelpfulCount] = useState(item.helpfulCount);
  const toggleLikeMutation = useToggleReviewLikeMutation();

  const variantStr = [item.colorVariantName, item.size].filter(Boolean).join(' / ');

  const handleToggleLike = () => {
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? helpfulCount + 1 : Math.max(0, helpfulCount - 1);
    setIsLiked(nextLiked);
    setHelpfulCount(nextCount);

    toggleLikeMutation.mutate(item.id, {
      onError: () => {
        setIsLiked(!nextLiked);
        setHelpfulCount(helpfulCount);
      },
    });
  };

  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <ThemedText style={styles.userName}>{item.userName}</ThemedText>
        <ThemedText style={styles.dateText}>{formatDate(item.createdAt)}</ThemedText>
      </View>

      <StarRating rating={item.rating} size={12} />

      <View style={styles.variantRow}>
        <ThemedText style={styles.variantText}>{variantStr}</ThemedText>
        {!!onBuyTheSame && (item.colorVariantName || item.size) && (
          <TouchableOpacity
            style={styles.buySameBtn}
            onPress={() => onBuyTheSame({ color: item.colorVariantName, size: item.size })}
            activeOpacity={0.7}
          >
            <ShoppingBag size={11} color={Palette.gray900} />
            <ThemedText style={styles.buySameText}>Buy the same</ThemedText>
            <ChevronRight size={11} color={Palette.gray900} />
          </TouchableOpacity>
        )}
      </View>

      <ThemedText style={styles.commentText}>{item.comment}</ThemedText>

      {item.images && item.images.length > 0 && (
        <View style={styles.imagesRow}>
          {item.images.map((img, idx) => (
            <TouchableOpacity key={idx} onPress={() => onOpenPhoto(item, idx)} activeOpacity={0.8}>
              <Image source={{ uri: img }} style={styles.thumbnail} contentFit="cover" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.helpfulRow}>
        <TouchableOpacity
          style={[styles.helpfulBtn, isLiked && styles.helpfulBtnActive]}
          onPress={handleToggleLike}
          activeOpacity={0.7}
        >
          <ThumbsUp
            size={12}
            color={isLiked ? Palette.gray900 : Palette.gray500}
            fill={isLiked ? Palette.gray900 : 'none'}
          />
          <ThemedText style={isLiked ? styles.helpfulTextActive : styles.helpfulText}>
            Helpful ({helpfulCount})
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
});
