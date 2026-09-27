import { useCallback } from 'react';
import { StyleProp, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, Share2, ShoppingBag } from 'lucide-react-native';

import { styles } from '../styles/product.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

/** 44pt-min touch target for the compact header icon buttons. */
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;

interface ProductDetailHeaderProps {
  itemCount: number;
  topCartBtnRef: React.RefObject<View | null>;
  animatedTopCartStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  onLayoutCartIcon: () => void;
  onOpenCart: () => void;
  onShare: () => void;
}

export function ProductDetailHeader({
  itemCount,
  topCartBtnRef,
  animatedTopCartStyle,
  onLayoutCartIcon,
  onOpenCart,
  onShare,
}: ProductDetailHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = useCallback(() => router.back(), [router]);
  const handleSearch = useCallback(() => router.push('/(tabs)/explore'), [router]);

  return (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerIconButton}
          hitSlop={HIT_SLOP}
          onPress={handleBack}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color={Palette.gray900} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerSearchPill}
          hitSlop={HIT_SLOP}
          onPress={handleSearch}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Search products"
        >
          <Search size={15} color={Palette.gray400} />
          <ThemedText style={styles.headerSearchText}>Search products</ThemedText>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <Animated.View style={animatedTopCartStyle}>
            <View ref={topCartBtnRef} collapsable={false} onLayout={onLayoutCartIcon}>
              <TouchableOpacity
                style={styles.headerIconButton}
                hitSlop={HIT_SLOP}
                onPress={onOpenCart}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="View cart"
              >
                <ShoppingBag size={20} color={Palette.gray900} />
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
          </Animated.View>

          <TouchableOpacity
            style={styles.headerIconButton}
            hitSlop={HIT_SLOP}
            onPress={onShare}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Share product"
          >
            <Share2 size={19} color={Palette.gray900} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
