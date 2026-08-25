import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.dangerTint,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: Palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
  },
  textBase: {
    fontSize: FontSize.caption,
    color: Palette.gray800,
  },
  textHighlight: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.danger,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
});
