import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowDivided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray100,
  },
  thumbBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    backgroundColor: Palette.gray100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    gap: Spacing.xxs,
  },
  name: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
    lineHeight: 17,
  },
  meta: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
  },
  cancelledTag: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
    color: Palette.danger,
    letterSpacing: 0.4,
  },
  price: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.extrabold,
    color: Palette.danger,
  },
});
