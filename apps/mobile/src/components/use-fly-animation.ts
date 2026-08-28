import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface FlyItemData {
  id: string;
  imageUrl?: string;
  imageUri?: string;
  startX?: number;
  startY?: number;
  targetX?: number;
  targetY?: number;
  startWidth?: number;
  startHeight?: number;
}

/**
 * Encapsulates the quadratic Bezier trajectory physics, perceptual scale,
 * and viewport bounds protection for the fly-to-cart animation.
 */
export function useFlyAnimation(item: FlyItemData, onComplete: () => void) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const progress = useSharedValue(0);

  const defaultStartX = windowWidth / 2;
  const defaultStartY = windowHeight / 2;
  const defaultTargetX = windowWidth - 28;
  const defaultTargetY = windowHeight - 34 - (insets.bottom || 0);

  const startX = item.startX && item.startX > 20 ? item.startX : defaultStartX;
  const startY = item.startY && item.startY > 20 ? item.startY : defaultStartY;
  const targetX = item.targetX && item.targetX > 20 ? item.targetX : defaultTargetX;
  const rawTargetY = item.targetY && item.targetY > 20 ? item.targetY : defaultTargetY;

  // Target coordinate directly matches the measured center of the cart icon
  const targetY = rawTargetY;
  const isFlyingToTop = targetY < 180;

  const startW = item.startWidth || 100;
  const startH = item.startHeight || 130;

  // Viewport bounds protection: prevent flight trajectory from shooting off-screen into negative Y
  const topSafeLimit = (insets.top || 30) + 12;

  // Bezier control point: curve trajectory while strictly keeping flight within visible viewport
  const controlX = isFlyingToTop ? (startX + targetX) / 2 - 30 : (startX + targetX) / 2 - 40;
  const controlY = isFlyingToTop
    ? Math.max(topSafeLimit + 20, Math.min(startY, targetY) + 30)
    : Math.max(topSafeLimit, Math.min(startY, targetY) - 70);

  useEffect(() => {
    progress.value = 0;
    // 780ms with smooth natural cubic ease-out gives ample time for the eye to track
    progress.value = withTiming(
      1,
      {
        duration: 780,
        easing: Easing.bezier(0.2, 0.8, 0.25, 1),
        reduceMotion: ReduceMotion.Never,
      },
      (finished) => {
        if (finished) runOnJS(onComplete)();
      },
    );
    return () => cancelAnimation(progress);
  }, [progress, onComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;

    // Quadratic Bezier: B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
    const oneMinusP = 1 - p;
    const centerX = oneMinusP * oneMinusP * startX + 2 * oneMinusP * p * controlX + p * p * targetX;
    const centerY = oneMinusP * oneMinusP * startY + 2 * oneMinusP * p * controlY + p * p * targetY;

    // Convert center coordinate to top-left transform offset
    const x = centerX - startW / 2;
    const y = centerY - startH / 2;

    // Perceptual scale: pop up slightly on launch (1.0 -> 1.08), stay large during flight, shrink at landing
    const scale = interpolate(p, [0, 0.18, 0.72, 1], [1, 1.08, 0.65, 0.2], Extrapolation.CLAMP);

    // Subtle 3D tilt
    const rotate = interpolate(p, [0, 0.35, 0.85, 1], [0, -7, -2, 0], Extrapolation.CLAMP);

    // Border radius stays screenshot-like, then rounds into badge
    const borderRadius = interpolate(p, [0, 0.6, 1], [12, 12, 10], Extrapolation.CLAMP);

    // Stay solid and fully visible until the final 10% landing approach
    const opacity = interpolate(p, [0, 0.9, 1], [1, 1, 0], Extrapolation.CLAMP);
    const shadowOpacity = interpolate(p, [0, 0.8, 1], [0.22, 0.16, 0], Extrapolation.CLAMP);

    return {
      opacity,
      borderRadius,
      shadowOpacity,
      transform: [{ translateX: x }, { translateY: y }, { scale }, { rotateZ: `${rotate}deg` }],
    };
  }, [startX, startY, targetX, targetY, controlX, controlY, startW, startH]);

  return { animatedStyle, startW, startH };
}
