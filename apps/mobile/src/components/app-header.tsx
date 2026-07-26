import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Menu, Mail, Search, Heart, ShoppingCart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useCart } from '@/features/cart/context/cart-context';
import { moderateScale, responsiveFontSize } from '@/utils/responsive';

interface AppHeaderProps {
  showSubHeader?: boolean;
  initialSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  transparent?: boolean;
}

const SUB_TABS = ['All', 'Women', 'Men', 'Kids', 'Curve', 'Home'];

export function AppHeader({
  showSubHeader = true,
  initialSubTab = 'Men',
  onSubTabChange,
  transparent = false,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const router = useRouter();
  const { itemCount } = useCart();
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);


  const handleSubTabPress = (tab: string) => {
    setActiveSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  // Determine styles and colors based on transparency
  const headerBgColor = transparent ? 'transparent' : colors.background;
  const textColor = transparent ? '#ffffff' : colors.text;
  const secondaryTextColor = transparent ? 'rgba(255, 255, 255, 0.65)' : colors.textSecondary;
  const borderBottomColor = transparent 
    ? 'transparent' 
    : 'rgba(0, 0, 0, 0.05)';

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: headerBgColor,
          paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 6,
          borderBottomColor: borderBottomColor,
          borderBottomWidth: transparent ? 0 : 1,
        },
        transparent && styles.absoluteHeader,
      ]}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        {/* Left Actions */}
        <View style={styles.iconGroup}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Menu size={22} color={textColor} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Mail size={22} color={textColor} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <TouchableOpacity 
          style={styles.logoContainer} 
          activeOpacity={0.8}
          onPress={() => router.push('/')}
        >
          <ThemedText style={[styles.logoText, { color: textColor }]}>CELEBS</ThemedText>
        </TouchableOpacity>

        {/* Right Actions */}
        <View style={styles.iconGroup}>
          <TouchableOpacity 
            style={styles.iconButton} 
            activeOpacity={0.7}
            onPress={() => router.push('/explore')}
          >
            <Search size={22} color={textColor} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Heart size={22} color={textColor} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton} 
            activeOpacity={0.7}
            onPress={() => router.push('/cart')}
          >
            <ShoppingCart size={22} color={textColor} strokeWidth={2} />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <ThemedText style={styles.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>


      {/* Sub Header (Horizontal Scrolling Category Tabs) */}
      {showSubHeader && (
        <View style={styles.subHeaderContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subScrollContent}
          >
            {SUB_TABS.map((tab) => {
              const isActive = activeSubTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.subTabButton,
                    isActive && { borderBottomColor: textColor },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleSubTabPress(tab)}
                >
                  <ThemedText
                    maxFontSizeMultiplier={1.15}
                    style={[
                      styles.subTabText,
                      isActive && styles.subTabActiveText,
                      isActive ? { color: textColor } : { color: secondaryTextColor },
                    ]}
                  >
                    {tab}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    zIndex: 100,
  },
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconButton: {
    padding: 6,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-CondensedBold' : 'sans-serif-condensed',
  },
  subHeaderContainer: {
    height: 38,
    width: '100%',
  },
  subScrollContent: {
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    flexDirection: 'row',
  },
  subTabButton: {
    paddingHorizontal: Spacing.three,
    height: '100%',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  subTabActiveText: {
    fontWeight: '700',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ff3b30',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
});

