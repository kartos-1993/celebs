import { StyleSheet } from 'react-native';

import { Palette } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    aspectRatio: 3 / 4,
    backgroundColor: Palette.gray100,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
