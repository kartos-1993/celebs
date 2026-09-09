import React from 'react';
import { GestureResponderEvent, TouchableOpacity } from 'react-native';
import { Heart } from 'lucide-react-native';

import { styles } from './product-card.styles';

import { Palette } from '@/constants/theme';

interface ProductCardWishlistButtonProps {
  isFavorite: boolean;
  isWishlistBusy: boolean;
  onToggleWishlist: (e?: GestureResponderEvent) => void;
}

export function ProductCardWishlistButton({
  isFavorite,
  isWishlistBusy,
  onToggleWishlist,
}: ProductCardWishlistButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.heartButton, { backgroundColor: 'rgba(255, 255, 255, 0.85)' }]}
      onPress={onToggleWishlist}
      disabled={isWishlistBusy}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart
        size={14}
        color={isFavorite ? Palette.danger : Palette.gray900}
        fill={isFavorite ? Palette.danger : 'transparent'}
      />
    </TouchableOpacity>
  );
}
