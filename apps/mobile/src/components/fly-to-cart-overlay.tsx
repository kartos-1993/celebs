import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';

import { styles } from './fly-to-cart-overlay.styles';
import { FlyItemData, useFlyAnimation } from './use-fly-animation';

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

function ScreenshotFlyItem({ item, onComplete }: { item: FlyItemData; onComplete: () => void }) {
  const { animatedStyle, startW, startH } = useFlyAnimation(item, onComplete);

  return (
    <Animated.View
      style={[
        styles.flyingCard,
        {
          width: startW,
          height: startH,
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
