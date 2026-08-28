import { TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, Share2, ShoppingBag } from 'lucide-react-native';

import { styles } from '../styles/product.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ProductDetailHeaderProps {
  itemCount: number;
  topCartBtnRef: React.RefObject<View | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animatedTopCartStyle?: any;
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

  return (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => router.back()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color={Palette.gray900} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerSearchPill}
          onPress={() => router.push('/(tabs)/explore')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Search products"
        >
          <Search size={15} color={Palette.gray400} />
          <ThemedText style={styles.headerSearchText}>Search products</ThemedText>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <Animated.View style={animatedTopCartStyle}>
            <View ref={topCartBtnRef} onLayout={onLayoutCartIcon}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={onOpenCart}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="View cart"
              >
                <ShoppingBag size={20} color={Palette.gray900} />
                {itemCount > 0 && (
                  <View style={styles.cartBadge}>
                    <ThemedText style={styles.cartBadgeText}>{itemCount}</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={styles.headerIconButton}
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
