import { StyleSheet } from 'react-native';

import { Palette, Radius } from '@/constants/theme';

export const styles = StyleSheet.create({
  flyingCard: {
    position: 'absolute',
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.sm,
  },
});
