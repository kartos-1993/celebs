import React from 'react';
import {
  Animated,
  GestureResponderEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Image } from 'expo-image';

import { getOptimizedImageUrl } from '@celebs/shared-utils';

import { resolveImageUrl } from '../hooks/use-products';
import type { Product } from '../types';

import { styles } from './product-card.styles';
import { ProductCardSwatchCapsule } from './product-card-swatch-capsule';
import { ProductCardWishlistButton } from './product-card-wishlist-button';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ProductCardImageGalleryProps {
  cardWidth: number;
  cardImages: string[];
  activeImageIndex: number;
  hintAnim: Animated.Value;
  dpr: 1 | 2 | 3;
  isOutOfStock: boolean;
  isFavorite: boolean;
  isWishlistBusy: boolean;
  imageRef: React.RefObject<View | null>;
  scrollViewRef: React.RefObject<ScrollView | null>;
  product: Product;
  selectedColorIndex: number;
  onPress: () => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onToggleWishlist: (e?: GestureResponderEvent) => void;
  onSelectColor: (idx: number, e?: GestureResponderEvent) => void;
}

export function ProductCardImageGallery({
  cardWidth,
  cardImages,
  activeImageIndex,
  hintAnim,
  dpr,
  isOutOfStock,
  isFavorite,
  isWishlistBusy,
  imageRef,
  scrollViewRef,
  product,
  selectedColorIndex,
  onPress,
  onScroll,
  onToggleWishlist,
  onSelectColor,
}: ProductCardImageGalleryProps) {
  return (
    <View
      ref={imageRef}
      collapsable={false}
      style={[styles.imageContainer, { backgroundColor: Palette.gray100 }]}
    >
      {cardImages.length > 0 ? (
        <Animated.View
          style={[
            { flex: 1, transform: [{ translateX: hintAnim }] },
            isOutOfStock && styles.oosImage,
          ]}
        >
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            scrollEventThrottle={32}
            style={styles.imageScrollView}
          >
            {cardImages.map((imgSrc, idx) => {
              const resolvedUrl = resolveImageUrl(imgSrc);
              const optimizedUrl = getOptimizedImageUrl(resolvedUrl, { preset: 'grid-card', dpr });
              const finalUri = optimizedUrl || resolvedUrl;

              return (
                <Pressable
                  key={`${imgSrc}-${idx}`}
                  onPress={onPress}
                  style={{ width: cardWidth, height: '100%' }}
                >
                  {finalUri ? (
                    <Image
                      source={{ uri: finalUri }}
                      style={styles.productImage}
                      contentFit="cover"
                      transition={150}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <ThemedText type="small" style={{ opacity: 0.4 }}>
                        No Image
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      ) : (
        <Pressable onPress={onPress} style={styles.placeholderImage}>
          <ThemedText type="small" style={{ opacity: 0.4 }}>
            No Image
          </ThemedText>
        </Pressable>
      )}

      {cardImages.length > 1 && (
        <View style={styles.paginationDotsContainer} pointerEvents="none">
          {cardImages.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.paginationDot,
                activeImageIndex === idx
                  ? styles.paginationDotActive
                  : styles.paginationDotInactive,
              ]}
            />
          ))}
        </View>
      )}

      {isOutOfStock && (
        <View style={styles.oosOverlay} pointerEvents="none">
          <View style={styles.oosBadge}>
            <ThemedText style={styles.oosBadgeText}>OUT OF STOCK</ThemedText>
          </View>
        </View>
      )}

      <ProductCardWishlistButton
        isFavorite={isFavorite}
        isWishlistBusy={isWishlistBusy}
        onToggleWishlist={onToggleWishlist}
      />

      <ProductCardSwatchCapsule
        variants={product.colorVariants}
        selectedColorIndex={selectedColorIndex}
        onSelectColor={onSelectColor}
      />
    </View>
  );
}
