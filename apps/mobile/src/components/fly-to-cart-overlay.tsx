import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
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
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {queue.map((item) => (
        <FlyItem key={item.id} item={item} onComplete={() => onAnimationComplete(item.id)} />
      ))}
    </View>
  );
}

function FlyItem({
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
    endX?: number;
    endY?: number;
    startWidth?: number;
    startHeight?: number;
  };
  onComplete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const progress = useSharedValue(0);

  // Dynamic cart icon coordinates - bottom tab bar is primary target
  const defaultStartX = windowWidth / 2;
  const defaultStartY = windowHeight - 100;
  const defaultTargetX = windowWidth - 28;
  const defaultTargetY = (insets.top || 30) + 20;

  const startX = item.startX && item.startX > 0 ? item.startX : defaultStartX;
  const startY = item.startY && item.startY > 0 ? item.startY : defaultStartY;
  const targetX = item.targetX && item.targetX > 20 ? item.targetX : defaultTargetX;
  const targetY = item.targetY && item.targetY > 20 ? item.targetY : defaultTargetY;

  const startW = item.startWidth || 70;
  const startH = item.startHeight || 90;

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(
      1,
      {
        duration: 520,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      },
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [progress, onComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;

    // Direct trajectory with smooth gentle arc to cart icon
    const currentX = startX + (targetX - startX) * p;
    const directY = startY + (targetY - startY) * p;
    const arcLift = Math.sin(Math.PI * p) * 30;
    const currentY = directY - arcLift;

    // Scale down smoothly from initial size into the cart icon
    const scale = Math.max(0.08, 1 - p * 0.85);

    // Fade out right as it lands into the cart icon
    let opacity = 1;
    if (p > 0.82) {
      opacity = (1 - p) / 0.18;
    }

    return {
      opacity,
      transform: [{ translateX: currentX }, { translateY: currentY }, { scale }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.flyingCard,
        {
          width: startW,
          height: startH,
          // Initial position is handled via transform, keep layout static for performance
        },
        animatedStyle,
      ]}
    >
      <ExpoImage
        source={{ uri: item.imageUrl ?? item.imageUri }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory"
        priority="low"
      />
    </Animated.View>
  );
}
