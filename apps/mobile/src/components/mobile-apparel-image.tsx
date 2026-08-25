import React from 'react';
import { PixelRatio, StyleProp, View, ViewStyle } from 'react-native';
import { Image, ImageStyle } from 'expo-image';

import { getOptimizedImageUrl, type ImagePreset } from '@celebs/shared-utils';

import { styles } from './mobile-apparel-image.styles';

import { resolveImageUrl } from '@/constants/config';

export interface MobileApparelImageProps {
  src: string;
  alt?: string;
  preset?: ImagePreset;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  priority?: 'low' | 'normal' | 'high';
  blurhash?: string;
}

export const MobileApparelImage: React.FC<MobileApparelImageProps> = ({
  src,
  alt,
  preset = 'grid-card',
  style,
  containerStyle,
  contentFit = 'cover',
  priority = 'normal',
  blurhash,
}) => {
  const dpr = Math.min(3, Math.max(1, Math.ceil(PixelRatio.get()))) as 1 | 2 | 3;
  const rawUrl = resolveImageUrl(src);
  const optimizedUrl = getOptimizedImageUrl(rawUrl, { preset, dpr });

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={{ uri: optimizedUrl || rawUrl }}
        placeholder={blurhash ? { blurhash } : undefined}
        contentFit={contentFit}
        transition={150}
        cachePolicy="memory-disk"
        priority={priority}
        accessibilityLabel={alt}
        style={[styles.image, style]}
      />
    </View>
  );
};
