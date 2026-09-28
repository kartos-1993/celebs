import React from 'react';
import { PixelRatio, StyleProp, View, ViewStyle } from 'react-native';
import { Image, ImageStyle } from 'expo-image';

import type { ImagePreset } from '@celebs/shared-utils';

import { styles } from './mobile-apparel-image.styles';

import { hasRenderableImage, resolveImageUrl } from '@/utils/image';

export interface MobileApparelImageProps {
  /** Stored key or absolute URL. Blank renders a neutral tile, never a broken image. */
  src?: string | null;
  alt?: string;
  preset?: ImagePreset;
  /** Required: the component has no intrinsic size, the call site owns it. */
  containerStyle: StyleProp<ViewStyle>;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  priority?: 'low' | 'normal' | 'high';
  blurhash?: string;
  onError?: () => void;
}

/**
 * The app's single photo component.
 *
 * Every catalogue image (product card slides, PDP gallery + zoom, cart thumb,
 * category circles, swatches, deal tiles, banners) renders through here, so the
 * two-step resolution in `@/utils/image` is applied exactly once per image and
 * `<Image source={{ uri: '' }}>` is unreachable: a blank or unresolvable `src`
 * renders the neutral container with no `<Image>` mounted at all.
 */
export const MobileApparelImage: React.FC<MobileApparelImageProps> = ({
  src,
  alt,
  preset = 'grid-card',
  containerStyle,
  style,
  contentFit = 'cover',
  priority = 'normal',
  blurhash,
  onError,
}) => {
  const dpr = Math.min(3, Math.max(1, Math.ceil(PixelRatio.get()))) as 1 | 2 | 3;
  const url = hasRenderableImage(src) ? resolveImageUrl(src, { preset, dpr }) : '';

  return (
    <View style={[styles.container, containerStyle]}>
      {url ? (
        <Image
          source={{ uri: url }}
          placeholder={blurhash ? { blurhash } : undefined}
          contentFit={contentFit}
          transition={150}
          cachePolicy="memory-disk"
          priority={priority}
          accessibilityLabel={alt}
          onError={onError}
          style={[styles.image, style]}
        />
      ) : null}
    </View>
  );
};
