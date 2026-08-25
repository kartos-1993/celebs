import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart, Mail, Menu, Search, ShoppingCart } from 'lucide-react-native';

import { styles } from './app-header.styles';

import { ThemedText } from '@/components/themed-text';
import { Colors, Palette } from '@/constants/theme';
import { useCart } from '@/features/cart/context/cart-context';
import { useCartSheet } from '@/features/cart/context/cart-sheet-context';

interface AppHeaderProps {
  showSubHeader?: boolean;
  initialSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  transparent?: boolean;
  scrollY?: number;
}

const SUB_TABS = ['All', 'Women', 'Men', 'Kids', 'Curve', 'Home'];

export function AppHeader({
  showSubHeader = true,
  initialSubTab = 'Men',
  onSubTabChange,
  transparent = false,
  scrollY = 0,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const router = useRouter();
  const { itemCount } = useCart();
  const { openCartSheet } = useCartSheet();
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  const handleSubTabPress = (tab: string) => {
    setActiveSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  // Calculate opacity transition (0 at top, 1 after scrolling 100px)
  const scrollProgress = transparent ? Math.min(1, Math.max(0, scrollY / 100)) : 1;

  // Determine styles and colors based on transparency and scroll progress
  const isSolid = !transparent || scrollProgress > 0.5;
  const headerBgColor = transparent
    ? `rgba(${scheme === 'dark' ? '0, 0, 0' : '255, 255, 255'}, ${scrollProgress})`
    : colors.background;

  const textColor = isSolid ? colors.text : Palette.white;
  const secondaryTextColor = isSolid ? colors.textSecondary : 'rgba(255, 255, 255, 0.65)';
  const borderBottomColor = isSolid ? Palette.overlaySoft : 'transparent';

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: headerBgColor,
          paddingTop: insets.top,
          borderBottomColor: borderBottomColor,
          borderBottomWidth: isSolid ? 1 : 0,
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
          onPress={() => router.push('/(tabs)' as never)}
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
            onPress={openCartSheet}
          >
            <ShoppingCart size={22} color={textColor} strokeWidth={2} />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <ThemedText style={styles.cartBadgeText}>
                  {itemCount > 99 ? '99+' : itemCount}
                </ThemedText>
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
                  style={[styles.subTabButton, isActive && { borderBottomColor: textColor }]}
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

