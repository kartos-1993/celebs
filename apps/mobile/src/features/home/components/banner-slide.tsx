import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';

import { styles } from '../styles/home.styles';
import type { Banner } from '../types';

import { MobileApparelImage } from '@/components/mobile-apparel-image';

export interface BannerSlideProps {
  banner: Banner;
  onPress: (banner: Banner) => void;
}

/**
 * Dedicated, memoized FlatList renderer (mobile AGENTS.md §8): no inline JSX
 * render function, and the press handler is a stable prop instead of a
 * per-render closure.
 */
export const BannerSlide = React.memo(function BannerSlide({ banner, onPress }: BannerSlideProps) {
  const handlePress = useCallback(() => onPress(banner), [onPress, banner]);

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={handlePress} style={styles.bannerWrapper}>
      <MobileApparelImage
        src={banner.imageUrl}
        preset="grid-card"
        containerStyle={styles.bannerImage}
        contentFit="cover"
        alt={banner.title ?? 'Promotion'}
      />
    </TouchableOpacity>
  );
});
