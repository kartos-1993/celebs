import React from 'react';
import { ColorValue, StyleSheet, useColorScheme, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Home, Search, ShoppingCart, TrendingUp, User } from 'lucide-react-native';

import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';

const TAB_BAR_CONTENT_HEIGHT = 56;

function CategoryIcon({ color, size }: { color: ColorValue; size: number }) {
  return (
    <View style={styles.categoryIconContainer}>
      <Search size={size} color={color} strokeWidth={2.2} />
      <View style={styles.categoryLines}>
        <View style={[styles.categoryLine, { backgroundColor: color }]} />
        <View style={[styles.categoryLine, { backgroundColor: color }]} />
        <View style={[styles.categoryLine, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function CartTabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
  const { pulseTrigger } = useFlyToCart();
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (pulseTrigger > 0) {
      scale.value = withSequence(
        withSpring(1.35, { damping: 6, stiffness: 200 }),
        withSpring(1.0, { damping: 10, stiffness: 180 }),
      );
    }
  }, [pulseTrigger, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View collapsable={false}>
      <Animated.View style={animatedStyle}>
        <ShoppingCart size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background,
          borderTopWidth: 0,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom + Spacing.sm,
          paddingTop: Spacing.sm,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: FontSize.footnote,
          fontWeight: FontWeight.semibold,
          marginTop: Spacing.xxs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Category',
          tabBarIcon: ({ color }) => <CategoryIcon color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: 'Trends',
          tabBarIcon: ({ color, focused }) => (
            <TrendingUp size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, focused }) => <CartTabIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  categoryIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  categoryLines: {
    gap: 2.2,
    justifyContent: 'center',
  },
  categoryLine: {
    width: 5,
    height: 1.5,
    borderRadius: 0.5,
  },
});
