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
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { getProductById, PRODUCT_QUERY_KEYS } from '../api';
import { resolveMinPrice } from '../utils/pricing';
import { isProductFullyOutOfStock } from '../utils/stock';

import { Product, resolveImageUrl } from './use-products';

import { showToast } from '@/components/toast/toast';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';
import { useWishlistActions, useWishlistStatus } from '@/features/wishlist/hooks/use-wishlist';
import { useNavigationGuard } from '@/utils/navigation-guard';

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
  const navigateSafely = useNavigationGuard();
  const queryClient = useQueryClient();
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
        navigateSafely(() => {
          router.navigate('/(tabs)/me');
        });
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

  const activeColorImages = product.colorVariants?.[selectedColorIndex]?.images;

  const cardImages: string[] = useMemo(() => {
    if (Array.isArray(activeColorImages) && activeColorImages.length > 0) {
      return activeColorImages.filter(
        (img): img is string => typeof img === 'string' && img.trim().length > 0,
      );
    }
    if (Array.isArray(product.mainImages) && product.mainImages.length > 0) {
      return product.mainImages.filter(
        (img): img is string => typeof img === 'string' && img.trim().length > 0,
      );
    }
    if (product.cover) {
      return [product.cover.trim()];
    }
    if (
      Array.isArray(product.colorVariants?.[0]?.images) &&
      product.colorVariants[0].images.length > 0
    ) {
      return product.colorVariants[0].images.filter(
        (img): img is string => typeof img === 'string' && img.trim().length > 0,
      );
    }
    return [];
  }, [activeColorImages, product.mainImages, product.cover, product.colorVariants]);

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

  // SHEIN-style card figure: minimum across SKUs (the only honest single
  // number without size context), product base when no SKUs exist.
  const minResolved = resolveMinPrice(product);
  const rawPrice = minResolved.price;
  const rawDiscount = minResolved.discountedPrice ?? null;
  const currentPrice =
    rawDiscount != null && rawDiscount > 0 ? rawDiscount : isNaN(rawPrice) ? 0 : rawPrice;
  const hasDiscount = Boolean(rawDiscount != null && rawDiscount < rawPrice);
  const discountPercent =
    hasDiscount && rawPrice > 0 ? Math.round(((rawPrice - rawDiscount!) / rawPrice) * 100) : 0;

  const priceColor = hasDiscount ? Palette.warning : Palette.black;
  const safePrice = isNaN(currentPrice) ? 0 : currentPrice;
  const integerPart = Math.floor(safePrice);
  const decimalPart = (safePrice % 1).toFixed(2).substring(1);

  const storeName = product.brand || 'BODI';

  const currentVariant = product.colorVariants?.[selectedColorIndex];
  const isSelectedVariantOutOfStock =
    currentVariant && Array.isArray(currentVariant.stocks) && currentVariant.stocks.length > 0
      ? currentVariant.stocks.every((s) => (s.quantity ?? 0) <= 0)
      : false;

  const isOutOfStock = isProductFullyOutOfStock(product) || isSelectedVariantOutOfStock;

  const handlePressIn = useCallback(() => {
    // 1. Prefetch fresh detail in background (placeholderData handles frame-0 UI without cache poisoning)
    queryClient.prefetchQuery({
      queryKey: PRODUCT_QUERY_KEYS.detail(product.id),
      queryFn: () => getProductById(product.id),
      staleTime: 1000 * 60 * 5,
    });

    // 2. Prefetch primary hero image
    if (resolvedPrimaryUrl) {
      Image.prefetch(resolvedPrimaryUrl);
    }
  }, [queryClient, product.id, resolvedPrimaryUrl]);

  const handlePress = useCallback(() => {
    navigateSafely(() => {
      if (onPress) {
        onPress(product);
      } else {
        // Forward the card's selected color so PDP opens on the same variant
        // instead of always defaulting to the first one.
        const selectedColorName = product.colorVariants?.[selectedColorIndex]?.name;
        router.navigate({
          pathname: '/product/[id]',
          params: selectedColorName
            ? { id: product.id, color: selectedColorName }
            : { id: product.id },
        });
      }
    });
  }, [navigateSafely, onPress, product, router, selectedColorIndex]);

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
    handlePressIn,
    handlePress,
    handleAddToCart,
  };
}
