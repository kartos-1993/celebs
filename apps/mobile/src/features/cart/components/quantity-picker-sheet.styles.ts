import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  productName: {
    fontSize: FontSize.caption,
    color: Palette.gray500,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  option: {
    minWidth: 48,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: Palette.gray900,
  },
  optionDisabled: {
    opacity: 0.35,
  },
  optionText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Palette.gray800,
  },
  optionTextSelected: {
    color: Palette.white,
  },
  stockNote: {
    fontSize: FontSize.micro,
    color: Palette.gray500,
  },
});
