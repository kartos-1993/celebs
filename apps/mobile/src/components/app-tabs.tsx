import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, View, StyleSheet, Platform } from 'react-native';
import { Home, TrendingUp, ShoppingCart, User, Search } from 'lucide-react-native';

import { Colors } from '@/constants/theme';

// Custom Category icon mimicking SHEIN's search-with-lines category icon
function CategoryIcon({ color, size }: { color: any; size: number }) {
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

import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';

function CartTabIcon({ color, focused }: { color: any; focused: boolean }) {
  const { pulseTrigger } = useFlyToCart();
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (pulseTrigger > 0) {
      scale.value = withSequence(
        withSpring(1.35, { damping: 6, stiffness: 200 }),
        withSpring(1.0, { damping: 10, stiffness: 180 })
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

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: '#555555',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.55)',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      {/* 1. Shop Tab (index) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* 2. Category Tab (explore) */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Category',
          tabBarIcon: ({ color }) => (
            <CategoryIcon color={color} size={20} />
          ),
        }}
      />

      {/* 3. Trends Tab */}
      <Tabs.Screen
        name="trends"
        options={{
          title: 'Trends',
          tabBarIcon: ({ color, focused }) => (
            <TrendingUp size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* 4. Cart Tab */}
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, focused }) => (
            <CartTabIcon color={color} focused={focused} />
          ),
        }}
      />

      {/* 5. Me Tab */}
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* 6. Category Products Detail Screen (Hidden from bottom tab bar) */}
      <Tabs.Screen
        name="category/[slug]"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />

      {/* 7. Product Detail Screen (Hidden from bottom tab bar) */}
      <Tabs.Screen
        name="product/[id]"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
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
