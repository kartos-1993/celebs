import { StyleSheet } from 'react-native';

import { FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray100,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  chipSelected: {
    backgroundColor: Palette.brandTint,
    borderColor: Palette.brand,
  },
  chipText: {
    fontSize: FontSize.caption,
    fontWeight: '500',
    color: Palette.gray600,
  },
  chipTextSelected: {
    color: Palette.brand,
    fontWeight: '700',
  },
});
