import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { clampColorIndex } from './use-product-variant-selection';

import { showToast } from '@/components/toast/toast';
import { useCart } from '@/features/cart/context/cart-context';
import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';
import { getProductById, PRODUCT_QUERY_KEYS } from '@/features/products/api';
import type { Product } from '@/features/products/hooks/use-products';
import { planCartAdd } from '@/features/products/utils/stock';
import { resolveImageUrl } from '@/utils/image';

/** Revalidates the detail entry; a failed revalidation falls back to the cached copy. */
async function fetchFreshProduct(
  queryClient: ReturnType<typeof useQueryClient>,
  product: Product,
): Promise<Product> {
  try {
    return await queryClient.fetchQuery({
      queryKey: PRODUCT_QUERY_KEYS.detail(product.id),
      queryFn: () => getProductById(product.id),
      staleTime: 0,
    });
  } catch {
    // Revalidation failed (offline?): the server guard still rejects oversells.
    return product;
  }
}

function toastMessageForAddError(err: unknown): string {
  const raw =
    err instanceof Error && err.message ? err.message : 'Could not add to cart. Please try again.';
  return /exceeds available stock|out of stock/i.test(raw) ? 'No stock available' : raw;
}

function triggerFly(variantImage: string | undefined, startFlyAnimation: (image: string) => void) {
  if (variantImage) startFlyAnimation(variantImage);
}

interface UseProductDetailCartParams {
  product: Product | null;
  selectedColorIndex: number;
  selectedSize: string;
  isFullyOutOfStock: boolean;
  onOpenSizeModal: () => void;
  // Optional ref to the product image for accurate fly animation start coords
  imageRef?: React.RefObject<View>;
}

export function useProductDetailCart({
  product,
  selectedColorIndex,
  selectedSize,
  isFullyOutOfStock,
  onOpenSizeModal,
  imageRef,
}: UseProductDetailCartParams) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { addToCart } = useCart();
  const { startFlyAnimation, setCartIconCoords, pulseTrigger } = useFlyToCart();
  const queryClient = useQueryClient();
  const topCartBtnRef = useRef<View>(null);
  const topCartCoordsRef = useRef<{ x: number; y: number }>({
    x: windowWidth - 72,
    y: (insets.top || 30) + 24,
  });
  const topCartScale = useSharedValue(1);
  const [isAdding, setIsAdding] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const measureTopCartIcon = useCallback(() => {
    if (!isMountedRef.current) return;
    topCartBtnRef.current?.measureInWindow((x, y, width, height) => {
      if (
        isMountedRef.current &&
        typeof x === 'number' &&
        typeof y === 'number' &&
        width > 0 &&
        height > 0
      ) {
        const coords = { x: x + width / 2, y: y + height / 2 };
        topCartCoordsRef.current = coords;
        setCartIconCoords(coords);
      }
    });
  }, [setCartIconCoords]);

  useEffect(() => {
    if (pulseTrigger > 0) {
      topCartScale.value = withSequence(
        withSpring(1.4, { damping: 6, stiffness: 200 }),
        withSpring(1.0, { damping: 10, stiffness: 180 }),
      );
    }
  }, [pulseTrigger, topCartScale]);

  const animatedTopCartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: topCartScale.value }],
  }));

  const triggerFlyAnimation = useCallback(
    (fallbackImage: string) => {
      const resolved = resolveImageUrl(fallbackImage);
      if (!resolved) return;

      // Always explicitly target the top header shopping bag icon on the product page
      const defaultHeaderCartX = windowWidth - 72;
      const defaultHeaderCartY = (insets.top || 30) + 24;
      const targetX = topCartCoordsRef.current?.x ?? defaultHeaderCartX;
      const targetY = topCartCoordsRef.current?.y ?? defaultHeaderCartY;

      const launch = (startX: number, startY: number, startWidth: number, startHeight: number) => {
        startFlyAnimation({
          imageUrl: resolved,
          startX,
          startY,
          startWidth,
          startHeight,
          targetX,
          targetY,
        });
      };

      if (imageRef?.current) {
        imageRef.current.measureInWindow((x, y, width, height) => {
          const isValid =
            typeof x === 'number' && !isNaN(x) && typeof y === 'number' && !isNaN(y) && width > 0;
          if (isValid) {
            launch(x + width / 2, y + height / 2, width, height);
          } else {
            launch(windowWidth / 2, 300, 100, 120);
          }
        });
      } else {
        launch(windowWidth / 2, 300, 100, 120);
      }
    },
    [imageRef, insets.top, startFlyAnimation, windowWidth],
  );

  const handleAddToCart = useCallback(
    async (overrideSize?: string) => {
      if (!product) return;
      // A legacy 'Standard'/'Default' value is a nothing-selected state, never
      // a real pick — filtered with the shared placeholder helper at submit time.
      const requestedSize = overrideSize || selectedSize;

      setIsAdding(true);
      try {
        // Truth check before celebration: revalidate the detail entry and judge
        // stock on the fresh copy, not the possibly-stale render copy. Server
        // CTE remains the final guard for the check-to-write race.
        const freshProduct = await fetchFreshProduct(queryClient, product);
        // The size modal and the stock verdict must target the FRESH variant
        // list: a refetch that returned fewer variants would otherwise make the
        // modal resolve against the wrong (or no) SKU.
        const variantIndex = clampColorIndex(
          selectedColorIndex,
          freshProduct.colorVariants?.length ?? 0,
        );
        const plan = planCartAdd({
          product: freshProduct,
          variantIndex,
          requestedSize,
          isFullyOutOfStock,
        });

        if (plan.kind === 'out-of-stock') {
          showToast('No stock available', { type: 'error' });
          return;
        }
        if (plan.kind === 'pick-size') {
          onOpenSizeModal();
          return;
        }
        if (plan.kind === 'unresolved') {
          showToast('Please select a size and color', { type: 'error' });
          return;
        }

        await addToCart({
          productId: freshProduct.id,
          quantity: 1,
          size: plan.size,
          colorVariantName: plan.color,
        });
        triggerFly(freshProduct.colorVariants?.[variantIndex]?.images?.[0], triggerFlyAnimation);
      } catch (err: unknown) {
        showToast(toastMessageForAddError(err), { type: 'error' });
      } finally {
        setIsAdding(false);
      }
    },
    [
      product,
      selectedColorIndex,
      selectedSize,
      isFullyOutOfStock,
      onOpenSizeModal,
      addToCart,
      triggerFlyAnimation,
      queryClient,
    ],
  );

  return {
    isAdding,
    handleAddToCart,
    measureTopCartIcon,
    animatedTopCartStyle,
    topCartBtnRef,
    triggerFlyAnimation,
  };
}
