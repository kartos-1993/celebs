import React, { useCallback, useEffect, useRef, useState } from 'react';
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

/** Same render-window policy as the homepage card: mount visible ±1 only. */
const GALLERY_WINDOW = 1;

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ images, productName }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevImages, setPrevImages] = useState(images);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  if (images !== prevImages) {
    setPrevImages(images);
    setActiveIndex(0);
  }

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ x: 0, animated: false });
  }, [images]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (slide !== activeIndex) {
        setActiveIndex(slide);
      }
    },
    [activeIndex],
  );

  const dpr = Math.min(3, Math.max(1, Math.ceil(PixelRatio.get()))) as 1 | 2 | 3;
  const galleryImages = images.length > 0 ? images : ['https://via.placeholder.com/600x800'];

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {galleryImages.map((img, idx) => {
          const inWindow = Math.abs(idx - activeIndex) <= GALLERY_WINDOW;
          const resolvedUrl = inWindow ? resolveImageUrl(img) : '';
          const heroUrl = inWindow
            ? getOptimizedImageUrl(resolvedUrl, { preset: 'pdp-hero', dpr })
            : '';

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
              {inWindow ? (
                <Image
                  source={{ uri: heroUrl || resolvedUrl }}
                  style={styles.mainImage}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.mainImage, { backgroundColor: Palette.gray100 }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
              const inZoomWindow = Math.abs(idx - zoomIndex) <= GALLERY_WINDOW;
              const resolvedUrl = inZoomWindow ? resolveImageUrl(img) : '';
              const zoomUrl = inZoomWindow
                ? getOptimizedImageUrl(resolvedUrl, { preset: 'zoom' })
                : '';

              return (
                <View key={`zoom-${idx}`} style={styles.zoomSlide}>
                  {inZoomWindow ? (
                    <Image
                      source={{ uri: zoomUrl || resolvedUrl }}
                      style={styles.zoomImage}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={[styles.zoomImage, { backgroundColor: Palette.gray100 }]} />
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};
