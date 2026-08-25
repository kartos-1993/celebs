import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  group: {
    backgroundColor: Palette.white,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  brandName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  itemsWrapper: {
    gap: 0,
  },
});
