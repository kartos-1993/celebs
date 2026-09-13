import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PixelRatio,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { isProductFullyOutOfStock } from '../utils/stock';

import { Product, resolveImageUrl } from './use-products';

import { showToast } from '@/components/toast/toast';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';
import { useWishlistActions, useWishlistStatus } from '@/features/wishlist/hooks/use-wishlist';

const GRID_PADDING = 12;
const COLUMN_GAP = 6;

interface UseProductCardParams {
  product: Product;
  onPress?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  isFirstCard?: boolean;
}

export function useProductCard({
  product,
  onPress,
  onAddToCart,
  isFirstCard = false,
}: UseProductCardParams) {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const CARD_WIDTH = (windowWidth - GRID_PADDING * 2 - COLUMN_GAP) / 2;

  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { startFlyAnimation } = useFlyToCart();
  const { isLoggedIn } = useAuth();
  const { isWishlisted } = useWishlistStatus();
  const { addToWishlist, removeFromWishlist } = useWishlistActions();
  const isFavorite = isWishlisted(product.id);

  const isWishlistBusy = addToWishlist.isPending || removeFromWishlist.isPending;

  const handleToggleWishlist = useCallback(
    (e?: GestureResponderEvent) => {
      e?.stopPropagation?.();
      if (!isLoggedIn) {
        router.push('/(tabs)/me');
        return;
      }
      if (isWishlistBusy) return;

      if (isFavorite) {
        removeFromWishlist.mutate(product.id);
      } else {
        addToWishlist.mutate(product.id);
      }
    },
    [isLoggedIn, isFavorite, isWishlistBusy, router, product.id, addToWishlist, removeFromWishlist],
  );

  const imageRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const hintAnim = useMemo(() => new Animated.Value(0), []);

  const dpr = Math.min(3, Math.max(1, Math.ceil(PixelRatio.get()))) as 1 | 2 | 3;

  const productRecord = product as Product & Record<string, unknown>;
  const dynamicDataObj = productRecord.dynamicData as Record<string, unknown> | undefined;
  const dynamicValuesObj = dynamicDataObj?.values as Record<string, unknown> | undefined;
  const uploadedAssetsObj = productRecord.uploadedAssets as Record<string, unknown> | undefined;

  const activeColorImages = product.colorVariants?.[selectedColorIndex]?.images;

  const cardImages: string[] = useMemo(() => {
    let rawList: unknown[] = [];
    if (Array.isArray(activeColorImages) && activeColorImages.length > 0) {
      rawList = activeColorImages;
    } else if (Array.isArray(product.mainImages) && product.mainImages.length > 0) {
      rawList = product.mainImages;
    } else if (
      Array.isArray(dynamicValuesObj?.mainImage) &&
      dynamicValuesObj.mainImage.length > 0
    ) {
      rawList = dynamicValuesObj.mainImage;
    } else if (Array.isArray(dynamicDataObj?.mainImage) && dynamicDataObj.mainImage.length > 0) {
      rawList = dynamicDataObj.mainImage;
    } else if (
      Array.isArray(uploadedAssetsObj?.mainImages) &&
      uploadedAssetsObj.mainImages.length > 0
    ) {
      rawList = uploadedAssetsObj.mainImages;
    } else if (
      Array.isArray(product.colorVariants?.[0]?.images) &&
      product.colorVariants[0].images.length > 0
    ) {
      rawList = product.colorVariants[0].images;
    }

    return rawList
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }, [
    activeColorImages,
    product.mainImages,
    dynamicValuesObj,
    dynamicDataObj,
    uploadedAssetsObj,
    product.colorVariants,
  ]);

  const handleSelectColor = useCallback((idx: number, e?: GestureResponderEvent) => {
    e?.stopPropagation?.();
    setSelectedColorIndex(idx);
    setActiveImageIndex(0);
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const slide = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
      if (slide !== activeImageIndex && slide >= 0 && slide < cardImages.length) {
        setActiveImageIndex(slide);
      }
    },
    [CARD_WIDTH, activeImageIndex, cardImages.length],
  );

  // One-time swipe cue on the first feed card — only when there is a real
  // multi-photo gallery to discover, so it never fires on a blank frame.
  useEffect(() => {
    if (!isFirstCard || cardImages.length <= 1) return;
    let isMounted = true;
    const timer = setTimeout(() => {
      if (!isMounted) return;
      Animated.sequence([
        Animated.timing(hintAnim, { toValue: -28, duration: 400, useNativeDriver: true }),
        Animated.spring(hintAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
      ]).start();
    }, 700);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      hintAnim.stopAnimation();
    };
  }, [isFirstCard, cardImages.length, hintAnim]);

  const primaryImage = cardImages[0] || '';
  const resolvedPrimaryUrl = resolveImageUrl(primaryImage);

  const rawPrice = Number(product.price ?? 0);
  const rawDiscount =
    product.discountedPrice != null && !isNaN(Number(product.discountedPrice))
      ? Number(product.discountedPrice)
      : null;
  const currentPrice =
    rawDiscount != null && rawDiscount > 0 ? rawDiscount : isNaN(rawPrice) ? 0 : rawPrice;
  const hasDiscount = Boolean(rawDiscount != null && rawDiscount < rawPrice);
  const discountPercent =
    hasDiscount && rawPrice > 0
      ? Math.round(((rawPrice - rawDiscount!) / rawPrice) * 100)
      : (productRecord.discountPercent as number | undefined) || 0;

  const priceColor = hasDiscount ? Palette.warning : Palette.black;
  const safePrice = isNaN(currentPrice) ? 0 : currentPrice;
  const integerPart = Math.floor(safePrice);
  const decimalPart = (safePrice % 1).toFixed(2).substring(1);

  const storeName = product.brand || (productRecord.vendorName as string | undefined) || 'BODI';

  const currentVariant = product.colorVariants?.[selectedColorIndex];
  const isSelectedVariantOutOfStock =
    currentVariant && Array.isArray(currentVariant.stocks) && currentVariant.stocks.length > 0
      ? currentVariant.stocks.every((s) => (s.quantity ?? 0) <= 0)
      : false;

  const isOutOfStock = isProductFullyOutOfStock(product) || isSelectedVariantOutOfStock;

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(product);
    } else {
      // Forward the card's selected color so PDP opens on the same variant
      // (SHEIN behavior) instead of always defaulting to the first one.
      const selectedColorName = product.colorVariants?.[selectedColorIndex]?.name;
      router.push({
        pathname: '/product/[id]',
        params: selectedColorName
          ? { id: product.id, color: selectedColorName }
          : { id: product.id },
      });
    }
  }, [onPress, product, router, selectedColorIndex]);

  const handleAddToCart = useCallback(
    (evt?: GestureResponderEvent) => {
      evt?.stopPropagation?.();
      if (isOutOfStock) {
        showToast('Out of stock', { type: 'error' });
        return;
      }
      const touchX = evt?.nativeEvent?.pageX;
      const touchY = evt?.nativeEvent?.pageY;

      if (imageRef.current && resolvedPrimaryUrl) {
        imageRef.current.measureInWindow((x, y, width, height) => {
          const isValidMeasure =
            typeof x === 'number' && !isNaN(x) && typeof y === 'number' && !isNaN(y);
          const startX = isValidMeasure ? x + width / 2 : touchX || windowWidth / 2;
          const startY = isValidMeasure ? y + height / 2 : touchY || 300;
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
    },
    [isOutOfStock, resolvedPrimaryUrl, windowWidth, startFlyAnimation, onAddToCart, product],
  );

  return {
    CARD_WIDTH,
    selectedColorIndex,
    activeImageIndex,
    isFavorite,
    isWishlistBusy,
    imageRef,
    scrollViewRef,
    hintAnim,
    dpr,
    cardImages,
    primaryImage,
    resolvedPrimaryUrl,
    currentPrice,
    hasDiscount,
    discountPercent,
    priceColor,
    integerPart,
    decimalPart,
    storeName,
    isOutOfStock,
    handleToggleWishlist,
    handleSelectColor,
    handleScroll,
    handlePress,
    handleAddToCart,
  };
}
