import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolate,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';

import { styles } from './fly-to-cart-overlay.styles';

import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';

export function FlyToCartOverlay() {
  const { queue, onAnimationComplete } = useFlyToCart();

  if (queue.length === 0) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]} pointerEvents="none">
      {queue.map((item) => (
        <ScreenshotFlyItem
          key={item.id}
          item={item}
          onComplete={() => onAnimationComplete(item.id)}
        />
      ))}
    </View>
  );
}

/**
 * Screenshot-style fly: feels like we snapped the image and it shrinks into the cart.
 * Performant: only transform + opacity + borderRadius on UI thread (Reanimated worklet).
 * Bezier trajectory for natural arc, scale 1 -> 0.12, fade at 90%.
 */
function ScreenshotFlyItem({
  item,
  onComplete,
}: {
  item: {
    id: string;
    imageUrl?: string;
    imageUri?: string;
    startX?: number;
    startY?: number;
    targetX?: number;
    targetY?: number;
    startWidth?: number;
    startHeight?: number;
  };
  onComplete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const progress = useSharedValue(0);

  // Targets: bottom tab cart by default (measured via CartTabIcon), fallback to top-right
  const defaultStartX = windowWidth / 2;
  const defaultStartY = windowHeight / 2;
  const defaultTargetX = windowWidth - 28;
  const defaultTargetY = windowHeight - 34 - (insets.bottom || 0);

  const startX = item.startX && item.startX > 20 ? item.startX : defaultStartX;
  const startY = item.startY && item.startY > 20 ? item.startY : defaultStartY;
  const targetX = item.targetX && item.targetX > 20 ? item.targetX : defaultTargetX;
  const targetY = item.targetY && item.targetY > 20 ? item.targetY : defaultTargetY;

  const startW = item.startWidth || 110;
  const startH = item.startHeight || 140;

  // Bezier control point: higher arc so flight is visible longer, slight left curve
  const controlX = (startX + targetX) / 2 - 60;
  const controlY = Math.min(startY, targetY) - 180;

  useEffect(() => {
    progress.value = 0;
    // Clearly visible: 1.8s linear so speed is constant and trackable
    progress.value = withTiming(
      1,
      {
        duration: 1800,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
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
    // Convert center to top-left for transform (left:0 top:0)
    const x = centerX - startW / 2;
    const y = centerY - startH / 2;

    // Screenshot shrink: hold screenshot 40% of flight, then shrink into badge
    const scale = interpolate(p, [0, 0.35, 0.8, 1], [1, 0.92, 0.34, 0.18], Extrapolate.CLAMP);
    // Subtle 3D tilt, more visible with slower flight
    const rotate = interpolate(p, [0, 0.4, 1], [0, -8, 0], Extrapolate.CLAMP);
    // Border radius stays screenshot-like, then rounds into badge
    const borderRadius = interpolate(p, [0, 0.6, 1], [12, 12, 10], Extrapolate.CLAMP);
    // Opacity: stay fully visible until 92% then quick fade into cart
    const opacity = interpolate(p, [0, 0.92, 1], [1, 1, 0], Extrapolate.CLAMP);
    // Shadow visible entire flight
    const shadowOpacity = interpolate(p, [0, 0.8, 1], [0.22, 0.16, 0], Extrapolate.CLAMP);

    return {
      opacity,
      borderRadius,
      shadowOpacity,
      transform: [{ translateX: x }, { translateY: y }, { scale }, { rotateZ: `${rotate}deg` }],
    };
  }, [startX, startY, targetX, targetY, controlX, controlY, startW, startH]);

  // Initial snapshot flash: white border + shadow like iOS screenshot
  return (
    <Animated.View
      style={[
        styles.flyingCard,
        {
          width: startW,
          height: startH,
          // Keep layout static; all motion via transform (GPU compositable)
        },
        styles.screenshotFrame,
        animatedStyle,
      ]}
    >
      <ExpoImage
        source={{ uri: item.imageUrl ?? item.imageUri }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
      />
    </Animated.View>
  );
}
