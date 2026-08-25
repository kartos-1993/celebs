import { StyleSheet } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.overlay,
  },
  overlayTouch: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  dragZone: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray200,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  footer: {
    paddingTop: Spacing.sm,
  },
});
