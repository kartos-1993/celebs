import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { showToast } from '@/components/toast/toast';
import { useCart } from '@/features/cart/context/cart-context';
import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';
import type { Product } from '@/features/products/hooks/use-products';
import { resolveImageUrl } from '@/features/products/hooks/use-products';
import { isSizeOutOfStockForVariant } from '@/features/products/utils/stock';

interface UseProductDetailCartParams {
  product: Product | null;
  selectedColorIndex: number;
  selectedSize: string;
  isFullyOutOfStock: boolean;
  onOpenSizeModal: () => void;
}

export function useProductDetailCart({
  product,
  selectedColorIndex,
  selectedSize,
  isFullyOutOfStock,
  onOpenSizeModal,
}: UseProductDetailCartParams) {
  const { addToCart } = useCart();
  const { startFlyAnimation, setCartIconCoords, pulseTrigger } = useFlyToCart();
  const topCartBtnRef = useRef<View>(null);
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
    setTimeout(() => {
      if (!isMountedRef.current) return;
      topCartBtnRef.current?.measureInWindow((x, y, width, height) => {
        if (isMountedRef.current && typeof x === 'number' && x > 0 && y > 0) {
          setCartIconCoords({ x: x + width / 2, y: y + height / 2 });
        }
      });
    }, 100);
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

  const handleAddToCart = async (overrideSize?: string) => {
    if (!product) return;
    const finalSize = overrideSize || selectedSize;
    const currentVariant = product.colorVariants?.[selectedColorIndex];
    const isFinalOos = finalSize ? isSizeOutOfStockForVariant(currentVariant, finalSize) : false;

    if (isFullyOutOfStock || isFinalOos) {
      showToast('No stock available', { type: 'error' });
      return;
    }
    if (product.sizes && product.sizes.length > 0 && !finalSize) {
      onOpenSizeModal();
      return;
    }

    setIsAdding(true);
    try {
      await addToCart({
        productId: product.id,
        quantity: 1,
        size: finalSize || 'Standard',
        colorVariantName: product.colorVariants?.[selectedColorIndex]?.name || 'Standard',
      });
      const flyImage =
        product.colorVariants?.[selectedColorIndex]?.images?.[0] || product.mainImages?.[0] || '';
      if (flyImage) {
        startFlyAnimation({
          imageUrl: resolveImageUrl(flyImage),
          startX: 180,
          startY: 500,
          startWidth: 100,
          startHeight: 120,
        });
      }
    } catch (err: unknown) {
      const raw =
        err instanceof Error && err.message
          ? err.message
          : 'Could not add to cart. Please try again.';
      const isOosError = /exceeds available stock|out of stock/i.test(raw);
      showToast(isOosError ? 'No stock available' : raw, { type: 'error' });
    } finally {
      setIsAdding(false);
    }
  };

  return {
    isAdding,
    handleAddToCart,
    measureTopCartIcon,
    animatedTopCartStyle,
    topCartBtnRef,
  };
}
