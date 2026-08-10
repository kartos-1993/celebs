import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { resolveImageUrl } from '@/constants/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 1.33; // 3:4 aspect ratio

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
        {galleryImages.map((img, idx) => (
          <TouchableOpacity
            key={`${img}-${idx}`}
            activeOpacity={0.95}
            onPress={() => {
              setZoomIndex(idx);
              setIsZoomModalOpen(true);
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`View full screen image ${idx + 1} of ${galleryImages.length}`}
          >
            <Image
              source={{ uri: resolveImageUrl(img) }}
              style={styles.mainImage}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        ))}
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
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {galleryImages.map((img, idx) => (
              <View key={`zoom-${idx}`} style={styles.zoomSlide}>
                <Image
                  source={{ uri: resolveImageUrl(img) }}
                  style={styles.zoomImage}
                  contentFit="contain"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: '#f3f4f6',
    position: 'relative',
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorDotActive: {
    width: 18,
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  zoomSlide: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
});
