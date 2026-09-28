import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

import { styles } from './product-gallery.styles';

import { MobileApparelImage } from '@/components/mobile-apparel-image';
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

  // A product with no picture renders ONE neutral slide. It used to be filled
  // with a third-party placeholder-image hotlink — a live request to someone
  // else's host in a production app. There is no local placeholder asset in the
  // repo, so the empty state is a neutral tile, never an invented remote URL.
  const galleryImages = images.length > 0 ? images : [''];

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
              <MobileApparelImage
                src={inWindow ? img : ''}
                preset="pdp-hero"
                containerStyle={styles.mainImage}
                contentFit="cover"
                alt={productName}
                priority={idx === 0 ? 'high' : 'normal'}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {images.length > 1 && (
        <View style={styles.indicatorContainer}>
          {images.map((_, idx) => (
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

              return (
                <View key={`zoom-${idx}`} style={styles.zoomSlide}>
                  <MobileApparelImage
                    src={inZoomWindow ? img : ''}
                    preset="zoom"
                    containerStyle={styles.zoomImage}
                    contentFit="contain"
                    alt={productName}
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
