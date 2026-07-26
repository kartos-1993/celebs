import React, { useEffect } from 'react';
import { StyleSheet, View, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';

import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';

export function FlyToCartOverlay() {
  const { activeAnimation, onAnimationComplete } = useFlyToCart();

  if (!activeAnimation) return null;

  return (
    <Modal visible={true} transparent={true} animationType="none" statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <FlyItem
          key={activeAnimation.id}
          item={activeAnimation}
          onComplete={onAnimationComplete}
        />
      </View>
    </Modal>
  );
}

function FlyItem({
  item,
  onComplete,
}: {
  item: any;
  onComplete: () => void;
}) {
  const progress = useSharedValue(0);

  const startX = item.startX;
  const startY = item.startY;
  const startW = item.startWidth || 80;
  const startH = item.startHeight || 80;

  const targetX = item.targetX ?? startX;
  const targetY = item.targetY ?? startY;

  // Arc height for parabolic effect
  const arcHeight = Math.max(120, Math.abs(startY - targetY) * 0.4);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(
      1,
      {
        duration: 650,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
      (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      }
    );
  }, [progress, onComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;

    // Linear X interpolation
    const currentX = startX + (targetX - startX) * p;

    // Parabolic Y arc: Y_start + (Y_target - Y_start) * p - arc * sin(pi * p)
    const linearY = startY + (targetY - startY) * p;
    const arcOffset = arcHeight * Math.sin(Math.PI * p);
    const currentY = linearY - arcOffset;

    // Zoom phase (0 -> 0.2): scale 1.0 to 1.25, then shrink to 0.2
    let scale = 1.0;
    if (p < 0.2) {
      scale = 1.0 + (p / 0.2) * 0.25; // 1.0 -> 1.25
    } else {
      scale = 1.25 - ((p - 0.2) / 0.8) * 1.05; // 1.25 -> 0.2
    }

    // Fade out near landing (0.85 -> 1.0)
    let opacity = 1.0;
    if (p > 0.85) {
      opacity = 1 - (p - 0.85) / 0.15;
    }

    return {
      left: currentX - startW / 2,
      top: currentY - startH / 2,
      width: startW,
      height: startH,
      opacity,
      transform: [
        { scale: Math.max(0.1, scale) },
        { rotate: `${p * 360}deg` },
      ],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.flyingThumbnail, animatedStyle]}>
        <ExpoImage
          source={{ uri: item.imageUrl }}
          style={styles.image}
          contentFit="cover"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flyingThumbnail: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 9999,
    zIndex: 9999,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
});
