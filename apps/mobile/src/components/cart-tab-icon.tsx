import React from 'react';
import { ColorValue, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { ShoppingCart } from 'lucide-react-native';

import { useCart } from '@/features/cart/context/cart-context';
import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';

export function CartTabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
  const { pulseTrigger, setCartIconCoords } = useFlyToCart();
  const { itemCount } = useCart();
  const scale = useSharedValue(1);
  const badgeScale = useSharedValue(1);
  const iconRef = React.useRef<View>(null);
  const prevCountRef = React.useRef(itemCount);

  // Measure bottom tab cart icon and sync as fly target
  const measureCartIcon = React.useCallback(() => {
    iconRef.current?.measureInWindow((x, y, width, height) => {
      if (typeof x === 'number' && typeof y === 'number' && width > 0 && height > 0) {
        setCartIconCoords({ x: x + width / 2, y: y + height / 2 });
      }
    });
  }, [setCartIconCoords]);

  React.useEffect(() => {
    measureCartIcon();
  }, [measureCartIcon]);

  // Icon bounce on fly landing
  React.useEffect(() => {
    if (pulseTrigger > 0) {
      scale.value = withSequence(
        withSpring(1.35, { damping: 6, stiffness: 200 }),
        withSpring(1.0, { damping: 10, stiffness: 180 }),
      );
    }
  }, [pulseTrigger, scale]);

  // Badge pop when number increases
  React.useEffect(() => {
    if (itemCount > prevCountRef.current) {
      badgeScale.value = withSequence(
        withSpring(1.6, { damping: 5, stiffness: 260 }),
        withSpring(1.0, { damping: 9, stiffness: 180 }),
      );
    }
    prevCountRef.current = itemCount;
  }, [itemCount, badgeScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  return (
    <View ref={iconRef} collapsable={false} onLayout={measureCartIcon} style={styles.iconContainer}>
      <Animated.View style={animatedStyle}>
        <ShoppingCart size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
      </Animated.View>
      {itemCount > 0 && (
        <Animated.View style={[styles.badge, badgeAnimatedStyle]}>
          <Animated.Text
            allowFontScaling={false}
            maxFontSizeMultiplier={1}
            numberOfLines={1}
            style={styles.badgeText}
          >
            {itemCount > 99 ? '99+' : String(itemCount)}
          </Animated.Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
