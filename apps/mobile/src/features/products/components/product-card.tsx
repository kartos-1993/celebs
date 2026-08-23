import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  GestureResponderEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PixelRatio,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight, Flame, Heart, ShoppingBag } from 'lucide-react-native';

import { getOptimizedImageUrl } from '@celebs/shared-utils';

import { Product, resolveImageUrl } from '../hooks/use-products';

import { styles } from './product-card.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 6;
const COLUMN_GAP = 6;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - COLUMN_GAP) / 2;

interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  isFirstCard?: boolean;
}

export function ProductCard({
  product,
  onPress,
  onAddToCart,
  isFirstCard = false,
}: ProductCardProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { startFlyAnimation } = useFlyToCart();

  const imageRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const hintAnim = useRef(new Animated.Value(0)).current;

  const dpr = Math.min(3, Math.max(1, Math.ceil(PixelRatio.get()))) as 1 | 2 | 3;

  const productRecord = product as Product & Record<string, unknown>;
  const dynamicDataObj = productRecord.dynamicData as Record<string, unknown> | undefined;
  const dynamicValuesObj = dynamicDataObj?.values as Record<string, unknown> | undefined;
  const uploadedAssetsObj = productRecord.uploadedAssets as Record<string, unknown> | undefined;

  // Resolve dynamic image list: strictly sanitize and filter out empty strings
  const activeColorImages = product.colorVariants?.[selectedColorIndex]?.images;

  const cardImages: string[] = useMemo(() => {
    let rawList: unknown[] = [];
    if (Array.isArray(activeColorImages) && activeColorImages.length > 0) {
      rawList = activeColorImages;
    } else if (Array.isArray(product.mainImages) && product.mainImages.length > 0) {
      rawList = product.mainImages;
    } else if (Array.isArray(dynamicValuesObj?.mainImage) && dynamicValuesObj.mainImage.length > 0) {
      rawList = dynamicValuesObj.mainImage;
    } else if (Array.isArray(dynamicDataObj?.mainImage) && dynamicDataObj.mainImage.length > 0) {
      rawList = dynamicDataObj.mainImage;
    } else if (Array.isArray(uploadedAssetsObj?.mainImages) && uploadedAssetsObj.mainImages.length > 0) {
      rawList = uploadedAssetsObj.mainImages;
    } else if (Array.isArray(product.colorVariants?.[0]?.images) && product.colorVariants[0].images.length > 0) {
      rawList = product.colorVariants[0].images;
    }

    return rawList
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }, [activeColorImages, product.mainImages, dynamicValuesObj, dynamicDataObj, uploadedAssetsObj, product.colorVariants]);

  // First-time discovery hint animation for the first card on mount
  useEffect(() => {
    let isMounted = true;
    if (isFirstCard && cardImages.length > 1) {
      const timer = setTimeout(() => {
        if (!isMounted) return;
        Animated.sequence([
          Animated.timing(hintAnim, {
            toValue: -28,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(hintAnim, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      }, 700);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        hintAnim.stopAnimation();
      };
    }
  }, [isFirstCard, cardImages.length, hintAnim]);

  const handleSelectColor = (idx: number, e?: GestureResponderEvent) => {
    e?.stopPropagation?.();
    setSelectedColorIndex(idx);
    setActiveImageIndex(0);
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
    if (slide !== activeImageIndex && slide >= 0 && slide < cardImages.length) {
      setActiveImageIndex(slide);
    }
  };

  const primaryImage = cardImages[activeImageIndex] || cardImages[0] || '';
  const resolvedPrimaryUrl = resolveImageUrl(primaryImage);

  const handlePress = () => {
    if (onPress) {
      onPress(product);
    } else {
      router.push({
        pathname: '/product/[id]',
        params: { id: product.id },
      });
    }
  };

  const handleAddToCart = (evt?: GestureResponderEvent) => {
    evt?.stopPropagation?.();
    const touchX = evt?.nativeEvent?.pageX;
    const touchY = evt?.nativeEvent?.pageY;

    if (imageRef.current && resolvedPrimaryUrl) {
      imageRef.current.measureInWindow((x, y, width, height) => {
        const startX =
          typeof x === 'number' && !isNaN(x) && x !== 0
            ? x + width / 2
            : touchX || SCREEN_WIDTH / 2;
        const startY =
          typeof y === 'number' && !isNaN(y) && y !== 0 ? y + height / 2 : touchY || 300;
        startFlyAnimation({
          imageUrl: resolvedPrimaryUrl,
          startX,
          startY,
          startWidth: width || 80,
          startHeight: height || 80,
        });
      });
    } else if (resolvedPrimaryUrl && touchX && touchY) {
      startFlyAnimation({
        imageUrl: resolvedPrimaryUrl,
        startX: touchX,
        startY: touchY,
        startWidth: 80,
        startHeight: 80,
      });
    }
    onAddToCart?.(product);
  };

  // Price & Savings calculations
  const currentPrice = product.discountedPrice || product.price;
  const hasDiscount = Boolean(product.discountedPrice && product.discountedPrice < product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discountedPrice!) / product.price) * 100)
    : (productRecord.discountPercent as number | undefined) || 0;

  const savingsAmount = hasDiscount
    ? Math.round(product.price - (product.discountedPrice || product.price))
    : 0;

  const priceColor = hasDiscount ? Palette.warning : Palette.black;
  const integerPart = Math.floor(currentPrice);
  const decimalPart = (currentPrice % 1).toFixed(2).substring(1);

  // Store & Brand
  const storeName = product.brand || (productRecord.vendorName as string | undefined) || 'BODI';

  return (
    <View style={[styles.cardContainer, { width: CARD_WIDTH, backgroundColor: Palette.white }]}>
      {/* 3:4 Aspect Ratio Image Gallery Viewport */}
      <View
        ref={imageRef}
        collapsable={false}
        style={[styles.imageContainer, { backgroundColor: Palette.gray100 }]}
      >
        {cardImages.length > 0 ? (
          <Animated.View style={{ flex: 1, transform: [{ translateX: hintAnim }] }}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              scrollEventThrottle={32}
              style={styles.imageScrollView}
            >
              {cardImages.map((imgSrc, idx) => {
                const resolvedUrl = resolveImageUrl(imgSrc);
                const optimizedUrl = getOptimizedImageUrl(resolvedUrl, {
                  preset: 'grid-card',
                  dpr,
                });
                const finalUri = optimizedUrl || resolvedUrl;

                return (
                  <Pressable
                    key={`${imgSrc}-${idx}`}
                    onPress={handlePress}
                    style={{ width: CARD_WIDTH, height: '100%' }}
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
          <Pressable onPress={handlePress} style={styles.placeholderImage}>
            <ThemedText type="small" style={{ opacity: 0.4 }}>
              No Image
            </ThemedText>
          </Pressable>
        )}

        {/* Swipe Pagination Dot Indicators */}
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

        {/* Wishlist Heart Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.heartButton, { backgroundColor: 'rgba(255, 255, 255, 0.85)' }]}
          onPress={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
        >
          <Heart
            size={14}
            color={isFavorite ? Palette.danger : Palette.gray900}
            fill={isFavorite ? Palette.danger : 'transparent'}
          />
        </TouchableOpacity>

        {/* Interactive Vertical Color Swatch Capsule Overlay */}
        {product.colorVariants && product.colorVariants.length > 0 && (
          <View style={styles.imageColorCapsule}>
            {product.colorVariants.slice(0, 4).map((variant, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.8}
                onPress={(e) => handleSelectColor(idx, e)}
                style={[
                  styles.capsuleColorDot,
                  { backgroundColor: variant.colorCode || '#8e8e93' },
                  selectedColorIndex === idx && styles.capsuleColorDotActive,
                ]}
              />
            ))}
            {product.colorVariants.length > 4 && (
              <ThemedText style={styles.capsuleCountText}>
                +{product.colorVariants.length - 4}
              </ThemedText>
            )}
          </View>
        )}
      </View>

      {/* Flush-Mount Dual-Tone "HOT SELLER | Save Rs. X" Banner Bar */}
      {hasDiscount && savingsAmount > 0 ? (
        <View style={styles.hotSellerBanner}>
          <View style={styles.hotSellerLeft}>
            <Flame size={10} color={Palette.gold} strokeWidth={2.5} />
            <ThemedText style={styles.hotSellerText}>HOT SELLER</ThemedText>
          </View>
          <View style={styles.hotSellerRight}>
            <ThemedText style={styles.saveAmountText}>Save Rs. {savingsAmount}</ThemedText>
          </View>
        </View>
      ) : null}

      {/* Content Details Area */}
      <Pressable onPress={handlePress} style={styles.detailsContainer}>
        {/* Brand Badge Line */}
        <View style={styles.brandBadgeRow}>
          <View style={styles.trendsBadge}>
            <ThemedText style={styles.trendsText}>Trends</ThemedText>
          </View>
          <View style={[styles.storeBadge, { backgroundColor: Palette.accentTint }]}>
            <ThemedText style={[styles.storeText, { color: Palette.accent }]}>{storeName}</ThemedText>
            <ChevronRight size={9} color={Palette.accent} />
          </View>
        </View>

        {/* Product Title */}
        <ThemedText numberOfLines={1} style={[styles.productName, { color: Palette.gray900 }]}>
          {product.name}
        </ThemedText>

        {/* Bestseller / Ranking Tag */}
        {product.featured ? (
          <View style={styles.bestsellerRow}>
            <ThemedText numberOfLines={1} style={styles.bestsellerText}>
              #1 Bestseller <ThemedText style={styles.bestsellerSub}>in Apparel</ThemedText>
            </ThemedText>
            <ChevronRight size={10} color={Palette.warning} />
          </View>
        ) : null}

        {/* Sales / New Arrival Row */}
        <View style={styles.salesRow}>
          <View style={[styles.newArrivalBadge, { backgroundColor: Palette.successTint }]}>
            <ThemedText style={[styles.newArrivalText, { color: Palette.success }]}>
              NEW ARRIVAL
            </ThemedText>
          </View>
          <ThemedText style={[styles.soldText, { color: Palette.gray500 }]}>80+ sold</ThemedText>
        </View>

        {/* Bottom 2-Column Price & Quick Add Row */}
        <View style={styles.bottomPriceRow}>
          <View style={styles.priceLeftCol}>
            <View style={styles.mainPriceGroup}>
              <ThemedText style={[styles.currencySymbol, { color: priceColor }]}>Rs.</ThemedText>
              <ThemedText style={[styles.integerPrice, { color: priceColor }]}>
                {integerPart}
              </ThemedText>
              <ThemedText style={[styles.decimalPrice, { color: priceColor }]}>
                {decimalPart}
              </ThemedText>
            </View>

            {hasDiscount && (
              <View style={styles.discountTagPill}>
                <ThemedText style={styles.discountTagText}>-{discountPercent}%</ThemedText>
              </View>
            )}
          </View>

          {/* Quick Add Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.cartActionButton,
              { backgroundColor: Palette.gray100, borderColor: Palette.gray200 },
            ]}
            onPress={handleAddToCart}
          >
            <ShoppingBag size={14} color={Palette.gray900} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </Pressable>
    </View>
  );
}
