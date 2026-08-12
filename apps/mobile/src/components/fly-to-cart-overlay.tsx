import React, { useEffect } from 'react';
import { Dimensions, Modal, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';

import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function FlyToCartOverlay() {
  const { activeAnimation, onAnimationComplete } = useFlyToCart();

  if (!activeAnimation) return null;

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      onRequestClose={() => {}}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <FlyItem key={activeAnimation.id} item={activeAnimation} onComplete={onAnimationComplete} />
      </View>
    </Modal>
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
  const progress = useSharedValue(0);

  // Dynamic header bar cart icon coordinates for any device
  const defaultStartX = SCREEN_WIDTH / 2;
  const defaultStartY = SCREEN_HEIGHT - 100;
  const defaultTargetX = SCREEN_WIDTH - 28;
  const defaultTargetY = (insets.top || 30) + 20;

  const startX = item.startX && item.startX > 0 ? item.startX : defaultStartX;
  const startY = item.startY && item.startY > 0 ? item.startY : defaultStartY;
  const targetX = item.targetX && item.targetX > 50 ? item.targetX : defaultTargetX;
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
        reduceMotion: ReduceMotion.Never, // Force animation on devices with Reduced Motion enabled
      },
      (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      },
    );
  }, [progress, onComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;

    // Direct trajectory with smooth gentle arc to top right cart icon
    const currentX = startX + (targetX - startX) * p;
    const directY = startY + (targetY - startY) * p;
    const arcLift = Math.sin(Math.PI * p) * 30;
    const currentY = directY - arcLift;

    // Scale down smoothly from initial size into the top cart icon
    const scale = Math.max(0.08, 1 - p * 0.85);

    // Fade out right as it lands into the cart icon
    let opacity = 1;
    if (p > 0.82) {
      opacity = (1 - p) / 0.18;
    }

    return {
      left: currentX - startW / 2,
      top: currentY - startH / 2,
      width: startW,
      height: startH,
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.flyingCard, animatedStyle]}>
      <ExpoImage
        source={{ uri: item.imageUrl }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flyingCard: {
    position: 'absolute',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});
