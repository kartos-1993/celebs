import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';

import { styles } from '../styles/review-gallery-modal.styles';
import type { ReviewGalleryItem } from '../types';

import { ReviewGalleryDetails } from './review-gallery-details';

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
  const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (initialIndex !== prevInitialIndex) {
    setPrevInitialIndex(initialIndex);
    setCurrentIndex(initialIndex);
  }

  if (!visible || items.length === 0) return null;

  const currentItem = items[currentIndex] ?? items[0];

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
          data={items}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex >= 0 && initialIndex < items.length ? initialIndex : 0}
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
        <ReviewGalleryDetails
          item={currentItem}
          bottomInset={insets.bottom}
          onAddToCart={onAddToCart}
        />
      </View>
    </Modal>
  );
}
