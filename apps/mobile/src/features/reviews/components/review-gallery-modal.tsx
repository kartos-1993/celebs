import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ShoppingBag, X } from 'lucide-react-native';

import { styles } from '../styles/review-gallery-modal.styles';
import type { ReviewGalleryItem } from '../types';

import { StarRating } from './star-rating';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface ReviewGalleryModalProps {
  visible: boolean;
  items: ReviewGalleryItem[];
  initialIndex?: number;
  onClose: (reviewId?: string) => void;
  onAddToCart?: (item: ReviewGalleryItem) => void;
}

export function ReviewGalleryModal({
  visible,
  items,
  initialIndex = 0,
  onClose,
  onAddToCart,
}: ReviewGalleryModalProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList<ReviewGalleryItem>>(null);

  useEffect(() => {
    if (visible && initialIndex >= 0 && initialIndex < items.length) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    }
  }, [visible, initialIndex, items.length]);

  if (!visible || items.length === 0) return null;

  const currentItem = items[currentIndex] ?? items[0];
  const variantText = [currentItem?.colorVariantName, currentItem?.size]
    .filter(Boolean)
    .join(' / ');

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx >= 0 && idx < items.length) {
      setCurrentIndex(idx);
    }
  };

  const handleClose = () => {
    onClose(currentItem?.reviewId);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        {/* Top bar */}
        <View style={[styles.headerBar, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
            <X size={20} color={Palette.white} />
          </TouchableOpacity>
          <View style={styles.counterBadge}>
            <ThemedText style={styles.counterText}>
              {currentIndex + 1} / {items.length}
            </ThemedText>
          </View>
        </View>

        {/* Gallery Carousel */}
        <FlatList
          ref={flatListRef}
          data={items}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.slideImage}
                contentFit="contain"
                transition={200}
                priority="high"
              />
            </View>
          )}
        />

        {/* Bottom Review Details & Sticky Add-to-Cart */}
        <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.userRow}>
            <ThemedText style={styles.userName}>{currentItem.userName}</ThemedText>
            <StarRating rating={currentItem.rating} size={13} />
          </View>

          {!!variantText && <ThemedText style={styles.variantText}>{variantText}</ThemedText>}

          <ScrollView
            style={styles.scrollableComment}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <ThemedText style={styles.commentText}>{currentItem.comment}</ThemedText>
          </ScrollView>

          {!!onAddToCart && (
            <TouchableOpacity
              style={styles.cartBtn}
              onPress={() => onAddToCart(currentItem)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShoppingBag size={15} color={Palette.gray900} />
                <ThemedText style={styles.cartBtnText}>Add to Cart</ThemedText>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
