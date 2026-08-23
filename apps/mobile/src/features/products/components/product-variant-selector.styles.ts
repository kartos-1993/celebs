import { StyleSheet } from 'react-native';

import {
  FontSize,
  FontWeight,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
    marginBottom: Spacing.md,
  },
  valueText: {
    fontWeight: FontWeight.regular,
    color: Palette.gray600,
  },
  sizeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sizeNoticeText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.danger,
  },
  variantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray100,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: Spacing.sm,
  },
  colorChipSelected: {
    backgroundColor: Palette.white,
    borderColor: Palette.gray900,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  colorThumbnail: {
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  chipText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    color: Palette.gray700,
  },
  chipTextSelected: {
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  sizeBox: {
    minWidth: 44,
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Palette.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  sizeBoxSelected: {
    backgroundColor: Palette.gray900,
    borderColor: Palette.gray900,
  },
  sizeBoxDisabled: {
    backgroundColor: Palette.gray100,
    borderColor: Palette.gray200,
    opacity: 0.4,
  },
  sizeText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Palette.gray700,
  },
  sizeTextSelected: {
    color: Palette.white,
  },
  sizeTextDisabled: {
    color: Palette.gray400,
    textDecorationLine: 'line-through',
  },
  stockNoticeBox: {
    marginTop: Spacing.md,
  },
  outOfStockText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.danger,
  },
  lowStockText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.warning,
  },
  inStockText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.success,
  },
});
