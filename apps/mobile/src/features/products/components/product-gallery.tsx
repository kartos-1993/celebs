import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PixelRatio,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';

import { getOptimizedImageUrl } from '@celebs/shared-utils';

import { styles } from './product-gallery.styles';

import { resolveImageUrl } from '@/constants/config';
import { Palette } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ images, productName }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Reset scroll position and active index when image list changes (e.g., color selection change)
  useEffect(() => {
    setActiveIndex(0);
    scrollViewRef.current?.scrollTo({ x: 0, animated: false });
  }, [images]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slide !== activeIndex) {
      setActiveIndex(slide);
    }
  };

  const dpr = Math.min(3, Math.max(1, Math.ceil(PixelRatio.get()))) as 1 | 2 | 3;
  const galleryImages = images.length > 0 ? images : ['https://via.placeholder.com/600x800'];

  return (
    <View style={styles.container}>
      {/* Scrollable Main Images */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {galleryImages.map((img, idx) => {
          const resolvedUrl = resolveImageUrl(img);
          const heroUrl = getOptimizedImageUrl(resolvedUrl, { preset: 'pdp-hero', dpr });

          return (
            <TouchableOpacity
              key={`${img}-${idx}`}
              activeOpacity={0.95}
              onPress={() => {
                setZoomIndex(idx);
                setIsZoomModalOpen(true);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`View full screen image ${idx + 1} of ${galleryImages.length} for ${productName}`}
            >
              <Image
                source={{ uri: heroUrl || resolvedUrl }}
                style={styles.mainImage}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Pagination Indicator Dots */}
      {galleryImages.length > 1 && (
        <View style={styles.indicatorContainer}>
          {galleryImages.map((_, idx) => (
            <View
              key={idx}
              style={[styles.indicatorDot, activeIndex === idx && styles.indicatorDotActive]}
            />
          ))}
        </View>
      )}

      {/* Fullscreen Zoom Modal */}
      <Modal
        visible={isZoomModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsZoomModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setIsZoomModalOpen(false)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close gallery"
          >
            <X size={24} color={Palette.white} />
          </TouchableOpacity>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: zoomIndex * SCREEN_WIDTH, y: 0 }}
          >
            {galleryImages.map((img, idx) => {
              const resolvedUrl = resolveImageUrl(img);
              const zoomUrl = getOptimizedImageUrl(resolvedUrl, { preset: 'zoom' });

              return (
                <View key={`zoom-${idx}`} style={styles.zoomSlide}>
                  <Image
                    source={{ uri: zoomUrl || resolvedUrl }}
                    style={styles.zoomImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};
