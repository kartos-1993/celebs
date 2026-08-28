import { StyleSheet } from 'react-native';

import { Palette, Radius } from '@/constants/theme';

export const styles = StyleSheet.create({
  flyingCard: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Palette.white,
    // Shadow removed during flight for performance - add elevation only on Android
    // shadow* triggers offscreen compositing every frame @520ms
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.sm,
  },
});
