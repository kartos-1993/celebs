import React, { useRef } from 'react';
import { FlatList, Modal, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, ShoppingBag, X } from 'lucide-react-native';

import { useProductReviews } from '../hooks/use-reviews';
import { styles } from '../styles/product-reviews-sheet.styles';
import type { ReviewGalleryItem, ReviewItem } from '../types';

import { StarRating } from './star-rating';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { formatDate } from '@/features/orders/utils/order-status';

interface ProductReviewsSheetProps {
  visible: boolean;
  productId: string;
  onClose: () => void;
  onBuyTheSame?: (variant: { color?: string | null; size?: string | null }) => void;
  onOpenGallery?: (galleryItems: ReviewGalleryItem[], initialIndex: number) => void;
}

export function ProductReviewsSheet({
  visible,
  productId,
  onClose,
  onBuyTheSame,
  onOpenGallery,
}: ProductReviewsSheetProps) {
  const { data: reviews = [], isLoading } = useProductReviews(productId, 1, 30);
  const flatListRef = useRef<FlatList<ReviewItem>>(null);

  const handleOpenPhoto = (review: ReviewItem, photoIndex: number) => {
    if (!onOpenGallery) return;
    const galleryItems: ReviewGalleryItem[] = reviews.flatMap((r) =>
      r.images.map((img, i) => ({
        id: `${r.id}_${i}`,
        reviewId: r.id,
        imageUrl: img,
        userName: r.userName,
        rating: r.rating,
        colorVariantName: r.colorVariantName,
        size: r.size,
        comment: r.comment,
        helpfulCount: r.helpfulCount,
        createdAt: r.createdAt,
      })),
    );

    const targetIdx = galleryItems.findIndex(
      (g) => g.reviewId === review.id && g.imageUrl === review.images[photoIndex],
    );
    onOpenGallery(galleryItems, Math.max(0, targetIdx));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.headerBar}>
            <ThemedText style={styles.headerTitle}>Customer Reviews ({reviews.length})</ThemedText>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={Palette.gray700} />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={reviews}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }}
            renderItem={({ item }) => {
              const variantStr = [item.colorVariantName, item.size].filter(Boolean).join(' / ');
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
                        onPress={() =>
                          onBuyTheSame({
                            color: item.colorVariantName,
                            size: item.size,
                          })
                        }
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
                        <TouchableOpacity
                          key={idx}
                          onPress={() => handleOpenPhoto(item, idx)}
                          activeOpacity={0.8}
                        >
                          <Image
                            source={{ uri: img }}
                            style={styles.thumbnail}
                            contentFit="cover"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>
                  {isLoading ? 'Loading reviews…' : 'No reviews yet for this product.'}
                </ThemedText>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}
