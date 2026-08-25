import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  allLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
  },
  verticalDivider: {
    width: 1,
    height: 16,
    backgroundColor: Palette.gray200,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xxs,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.black,
  },
  count: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.gray600,
  },
  shipToGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    flexShrink: 1,
  },
  shipToText: {
    fontSize: FontSize.footnote,
    color: Palette.gray600,
  },
  spacer: {
    flex: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitleAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
