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
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight, Flame, Heart, ShoppingBag } from 'lucide-react-native';
import { getOptimizedImageUrl } from '@celebs/shared-utils';

import { Product, resolveImageUrl } from '../hooks/use-products';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';
import { moderateScale, responsiveFontSize } from '@/utils/responsive';

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

  const priceColor = hasDiscount ? '#FF5000' : '#000000';
  const integerPart = Math.floor(currentPrice);
  const decimalPart = (currentPrice % 1).toFixed(2).substring(1);

  // Store & Brand
  const storeName = product.brand || (productRecord.vendorName as string | undefined) || 'BODI';

  return (
    <View style={[styles.cardContainer, { width: CARD_WIDTH, backgroundColor: '#ffffff' }]}>
      {/* 3:4 Aspect Ratio Image Gallery Viewport */}
      <View
        ref={imageRef}
        collapsable={false}
        style={[styles.imageContainer, { backgroundColor: '#f4f4f5' }]}
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
            color={isFavorite ? '#ff3b30' : '#1c1c1e'}
            fill={isFavorite ? '#ff3b30' : 'transparent'}
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
            <Flame size={10} color="#FEF08A" strokeWidth={2.5} />
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
          <View style={[styles.storeBadge, { backgroundColor: '#faf5ff' }]}>
            <ThemedText style={[styles.storeText, { color: '#6b21a8' }]}>{storeName}</ThemedText>
            <ChevronRight size={9} color="#7c3aed" />
          </View>
        </View>

        {/* Product Title */}
        <ThemedText numberOfLines={1} style={[styles.productName, { color: '#27272a' }]}>
          {product.name}
        </ThemedText>

        {/* Bestseller / Ranking Tag */}
        {product.featured ? (
          <View style={styles.bestsellerRow}>
            <ThemedText numberOfLines={1} style={styles.bestsellerText}>
              #1 Bestseller <ThemedText style={styles.bestsellerSub}>in Apparel</ThemedText>
            </ThemedText>
            <ChevronRight size={10} color="#d97706" />
          </View>
        ) : null}

        {/* Sales / New Arrival Row */}
        <View style={styles.salesRow}>
          <View style={[styles.newArrivalBadge, { backgroundColor: '#ecfdf5' }]}>
            <ThemedText style={[styles.newArrivalText, { color: '#047857' }]}>
              NEW ARRIVAL
            </ThemedText>
          </View>
          <ThemedText style={[styles.soldText, { color: '#71717a' }]}>80+ sold</ThemedText>
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
              { backgroundColor: '#f4f4f5', borderColor: '#e4e4e7' },
            ]}
            onPress={handleAddToCart}
          >
            <ShoppingBag size={14} color="#1c1c1e" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 8,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    position: 'relative',
    overflow: 'hidden',
  },
  imageScrollView: {
    width: '100%',
    height: '100%',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
  },

  /* Horizontal Paging Indicator Dots */
  paginationDotsContainer: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3.5,
    zIndex: 4,
  },
  paginationDot: {
    height: 3.5,
    borderRadius: 2,
  },
  paginationDotActive: {
    width: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 1,
  },
  paginationDotInactive: {
    width: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },

  heartButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 25,
    height: 25,
    borderRadius: 12.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },

  /* Vertical Color Swatch Capsule Overlay */
  imageColorCapsule: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    paddingHorizontal: 3.5,
    paddingVertical: 4,
    alignItems: 'center',
    gap: 3,
    zIndex: 5,
  },
  capsuleColorDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  capsuleColorDotActive: {
    borderColor: '#ffffff',
    borderWidth: 1.5,
    transform: [{ scale: 1.2 }],
  },
  capsuleCountText: {
    fontSize: 7.5,
    lineHeight: 8.5,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 0.5,
    textAlign: 'center',
  },

  /* Dual-Tone Hot Seller / Save Rs. Banner */
  hotSellerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DC2626',
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  hotSellerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  hotSellerText: {
    color: '#FEF08A',
    fontSize: responsiveFontSize(8),
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  hotSellerRight: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  saveAmountText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(8),
    fontWeight: '800',
  },

  /* Details Area */
  detailsContainer: {
    padding: 6,
    paddingTop: 4,
  },

  /* Brand Badge Row */
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  trendsBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
  },
  trendsText: {
    color: '#7e22ce',
    fontSize: responsiveFontSize(8.5),
    fontWeight: '800',
    fontStyle: 'italic',
    lineHeight: responsiveFontSize(10),
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
  },
  storeText: {
    fontSize: responsiveFontSize(8.5),
    fontWeight: '700',
    lineHeight: responsiveFontSize(10),
  },

  /* Product Title */
  productName: {
    fontSize: responsiveFontSize(11.5),
    fontWeight: '400',
    lineHeight: responsiveFontSize(15),
    marginBottom: 2,
  },

  /* Bestseller Row */
  bestsellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 2,
  },
  bestsellerText: {
    fontSize: responsiveFontSize(9),
    fontWeight: '800',
    color: '#d97706',
  },
  bestsellerSub: {
    fontSize: responsiveFontSize(9),
    fontWeight: '500',
    color: '#b45309',
  },

  /* Sales / New Arrival Row */
  salesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  newArrivalBadge: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
  },
  newArrivalText: {
    fontSize: responsiveFontSize(8),
    fontWeight: '800',
    lineHeight: responsiveFontSize(9.5),
  },
  soldText: {
    fontSize: responsiveFontSize(9.5),
    fontWeight: '500',
  },

  /* 2-Column Bottom Price & Add to Cart Row */
  bottomPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceLeftCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    flexWrap: 'nowrap',
    flex: 1,
    marginRight: 4,
  },
  mainPriceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: responsiveFontSize(9.5),
    fontWeight: '800',
    marginRight: 1,
  },
  integerPrice: {
    fontSize: responsiveFontSize(14.5),
    fontWeight: '900',
    lineHeight: responsiveFontSize(16.5),
  },
  decimalPrice: {
    fontSize: responsiveFontSize(9.5),
    fontWeight: '800',
  },

  discountTagPill: {
    backgroundColor: '#fff0ed',
    paddingHorizontal: 2.5,
    paddingVertical: 0.5,
    borderRadius: 2,
    marginLeft: 2,
  },
  discountTagText: {
    color: '#FF5000',
    fontSize: responsiveFontSize(8),
    lineHeight: responsiveFontSize(9.5),
    fontWeight: '800',
  },

  cartActionButton: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(6),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
