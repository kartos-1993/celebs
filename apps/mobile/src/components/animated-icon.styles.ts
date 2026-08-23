import { StyleSheet } from 'react-native';

import { Palette, Radius } from '@/constants/theme';

export const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: Radius.xxl,
    experimental_backgroundImage: `linear-gradient(180deg, ${Palette.brand}, ${Palette.brandPressed})`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
