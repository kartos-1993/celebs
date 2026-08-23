import { StyleSheet } from 'react-native';

import { FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray100,
    borderWidth: 1,
    borderColor: Palette.gray200,
    gap: Spacing.sm,
  },
  colorChipSelected: {
    backgroundColor: Palette.brandTint,
    borderColor: Palette.brand,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  colorThumbnail: {
    width: 16,
    height: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
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
