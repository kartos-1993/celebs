import { StyleSheet } from 'react-native';

import { Palette } from '@/constants/theme';

/**
 * The container carries NO intrinsic size on purpose: every call site owns its
 * own dimensions (a grid slide, an 88pt cart thumb, a 64pt circle) and passes
 * them through `containerStyle`. A hardcoded aspect ratio here would silently
 * fight those.
 */
export const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.gray100,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
