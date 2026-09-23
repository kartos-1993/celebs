import React, { useState } from 'react';
import { TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart, Mail, Menu, Search, ShoppingCart } from 'lucide-react-native';

import { styles } from './app-header.styles';
import { AppHeaderSubTabs } from './app-header-subtabs';

import { ThemedText } from '@/components/themed-text';
import { Colors, Palette } from '@/constants/theme';
import { useCart } from '@/features/cart/context/cart-context';
import { useCartSheet } from '@/features/cart/context/cart-sheet-context';
import { useUnreadCountQuery } from '@/features/notifications/hooks/use-notifications';

interface AppHeaderProps {
  showSubHeader?: boolean;
  initialSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  transparent?: boolean;
  scrollY?: number;
}

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
  const { data: unreadData } = useUnreadCountQuery();
  const unreadCount = unreadData?.count ?? unreadData?.unreadCount ?? 0;
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  const handleSubTabPress = (tab: string) => {
    setActiveSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  const scrollProgress = transparent ? Math.min(1, Math.max(0, scrollY / 100)) : 1;
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
      <View style={styles.topBar}>
        <View style={styles.iconGroup}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Menu size={22} color={textColor} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Mail size={22} color={textColor} strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={styles.cartBadge}>
                <ThemedText
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  numberOfLines={1}
                  style={styles.cartBadgeText}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoContainer}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)' as never)}
        >
          <ThemedText style={[styles.logoText, { color: textColor }]}>CELEBS</ThemedText>
        </TouchableOpacity>

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
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={openCartSheet}>
            <ShoppingCart size={22} color={textColor} strokeWidth={2} />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <ThemedText
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  numberOfLines={1}
                  style={styles.cartBadgeText}
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {showSubHeader && (
        <AppHeaderSubTabs
          activeSubTab={activeSubTab}
          onSelectSubTab={handleSubTabPress}
          textColor={textColor}
          secondaryTextColor={secondaryTextColor}
        />
      )}
    </View>
  );
}
