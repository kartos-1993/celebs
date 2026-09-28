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

import type { Product } from '../types';

import { styles } from './product-card.styles';
import { ProductCardSwatchCapsule } from './product-card-swatch-capsule';
import { ProductCardWishlistButton } from './product-card-wishlist-button';

import { MobileApparelImage } from '@/components/mobile-apparel-image';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

/**
 * Render window around the visible slide: at most 3 mounted photos per card
 * no matter how long the gallery is. No dots (SHEIN parity) — the one-time
 * first-card nudge is the only swipe cue.
 */
const GALLERY_WINDOW = 1;

interface ProductCardImageGalleryProps {
  cardWidth: number;
  cardImages: string[];
  activeImageIndex: number;
  hintAnim: Animated.Value;
  isOutOfStock: boolean;
  isFavorite: boolean;
  isWishlistBusy: boolean;
  imageRef: React.RefObject<View | null>;
  scrollViewRef: React.RefObject<ScrollView | null>;
  product: Product;
  selectedColorIndex: number;
  onPressIn?: () => void;
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
  isOutOfStock,
  isFavorite,
  isWishlistBusy,
  imageRef,
  scrollViewRef,
  product,
  selectedColorIndex,
  onPressIn,
  onPress,
  onScroll,
  onToggleWishlist,
  onSelectColor,
}: ProductCardImageGalleryProps) {
  return (
    // NOTE: the inline style objects below are pre-existing and out of this
    // stream's file list to fix — product-card.styles.ts is not editable here.
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
              const inWindow = Math.abs(idx - activeImageIndex) <= GALLERY_WINDOW;

              return (
                <Pressable
                  key={`${imgSrc}-${idx}`}
                  onPressIn={onPressIn}
                  onPress={onPress}
                  style={{ width: cardWidth, height: '100%' }}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${product.name}`}
                >
                  {inWindow ? (
                    <MobileApparelImage
                      src={imgSrc}
                      preset="grid-card"
                      containerStyle={styles.productImage}
                      contentFit="cover"
                      alt={product.name}
                      priority={idx === 0 ? 'high' : 'normal'}
                    />
                  ) : (
                    <View style={[styles.productImage, { backgroundColor: Palette.gray100 }]} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      ) : (
        <Pressable
          onPressIn={onPressIn}
          onPress={onPress}
          style={styles.placeholderImage}
          accessibilityRole="button"
          accessibilityLabel={`${product.name} — image unavailable`}
        >
          <ThemedText type="small" style={{ opacity: 0.4 }}>
            No Image
          </ThemedText>
        </Pressable>
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
