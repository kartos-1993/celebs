import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';

import { styles } from '../styles/product.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';

interface ProductBottomBarProps {
  isFavorite: boolean;
  isAdding: boolean;
  isAddToCartDisabled: boolean;
  onToggleWishlist: () => void;
  onAddToCart: () => void;
}

export function ProductBottomBar({
  isFavorite,
  isAdding,
  isAddToCartDisabled,
  onToggleWishlist,
  onAddToCart,
}: ProductBottomBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
      <TouchableOpacity
        style={styles.wishlistBtn}
        onPress={onToggleWishlist}
        activeOpacity={0.85}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          size={20}
          color={isFavorite ? Palette.danger : Palette.gray700}
          fill={isFavorite ? Palette.danger : 'transparent'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.addToCartBtn, isAddToCartDisabled && styles.addToCartBtnDisabled]}
        onPress={onAddToCart}
        disabled={isAdding || isAddToCartDisabled}
        activeOpacity={0.85}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={isAddToCartDisabled ? 'Out of stock' : 'Add product to cart'}
        accessibilityState={{ disabled: isAdding || isAddToCartDisabled }}
      >
        {isAdding ? (
          <ActivityIndicator size="small" color={Palette.white} />
        ) : (
          <ThemedText
            style={[styles.addToCartText, isAddToCartDisabled && styles.addToCartTextDisabled]}
          >
            {isAddToCartDisabled ? 'Out of Stock' : 'Add to Cart'}
          </ThemedText>
        )}
      </TouchableOpacity>
    </View>
  );
}
