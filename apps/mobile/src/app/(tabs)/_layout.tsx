import React from 'react';
import { ColorValue, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Home, Search, TrendingUp, User } from 'lucide-react-native';

import { CartTabIcon } from '@/components/cart-tab-icon';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';

const TAB_BAR_CONTENT_HEIGHT = 54;

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

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : Spacing.xs;

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
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset + Spacing.xs,
          paddingBottom: bottomInset,
          paddingTop: Spacing.xs,
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
