import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.sm,
    backgroundColor: Palette.gray100,
  },
  chipActive: {
    backgroundColor: Palette.gray900,
  },
  chipText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.medium,
    color: Palette.gray800,
  },
  chipTextActive: {
    color: Palette.white,
    fontWeight: FontWeight.semibold,
  },
});
