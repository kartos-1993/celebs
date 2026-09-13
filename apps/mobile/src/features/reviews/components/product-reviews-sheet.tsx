import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';

import { useProductReviews } from '../hooks/use-reviews';
import { styles } from '../styles/product-reviews-sheet.styles';
import type { ReviewGalleryItem, ReviewItem } from '../types';

import { ProductReviewItem } from './product-review-item';
import { ReviewGalleryModal } from './review-gallery-modal';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ProductReviewsSheetProps {
  visible: boolean;
  productId: string;
  onClose: () => void;
  onBuyTheSame?: (variant: { color?: string | null; size?: string | null }) => void;
  onAddToCart?: (item: ReviewGalleryItem) => void;
}

export function ProductReviewsSheet({
  visible,
  productId,
  onClose,
  onBuyTheSame,
  onAddToCart,
}: ProductReviewsSheetProps) {
  const { data: reviews = [], isLoading } = useProductReviews(productId, 1, 30);
  const flatListRef = useRef<FlatList<ReviewItem>>(null);

  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryItems, setGalleryItems] = useState<ReviewGalleryItem[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const handleOpenPhoto = (review: ReviewItem, photoIndex: number) => {
    const items: ReviewGalleryItem[] = reviews.flatMap((r) =>
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

    const targetIdx = items.findIndex(
      (g) => g.reviewId === review.id && g.imageUrl === review.images[photoIndex],
    );
    setGalleryItems(items);
    setGalleryIndex(Math.max(0, targetIdx));
    setGalleryVisible(true);
  };

  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const handleCloseGallery = (reviewId?: string) => {
    setGalleryVisible(false);
    if (!reviewId) return;

    const targetIndex = reviews.findIndex((r) => r.id === reviewId);
    if (targetIndex >= 0) {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: targetIndex,
          animated: true,
          viewPosition: 0.1,
        });
      }, 100);
    }
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
            renderItem={({ item }) => (
              <ProductReviewItem
                item={item}
                onBuyTheSame={onBuyTheSame}
                onOpenPhoto={handleOpenPhoto}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>
                  {isLoading ? 'Loading reviews…' : 'No reviews yet for this product.'}
                </ThemedText>
              </View>
            }
          />

          <ReviewGalleryModal
            visible={galleryVisible}
            items={galleryItems}
            initialIndex={galleryIndex}
            onClose={handleCloseGallery}
            onAddToCart={onAddToCart}
          />
        </View>
      </View>
    </Modal>
  );
}
