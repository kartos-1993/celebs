import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    backgroundColor: Palette.white,
  },
  checkboxWrap: {
    paddingTop: Spacing.xs,
  },
  thumbnail: {
    width: 88,
    height: 88,
    borderRadius: Radius.sm,
    backgroundColor: Palette.gray100,
  },
  content: {
    flex: 1,
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  productName: {
    flex: 1,
    fontSize: FontSize.small,
    fontWeight: FontWeight.medium,
    color: Palette.gray900,
    lineHeight: FontSize.small + 4,
  },
  removeBtn: {
    padding: Spacing.xxs,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  variantText: {
    fontSize: FontSize.caption,
    color: Palette.gray600,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: Spacing.xxs,
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    flex: 1,
  },
  strikePrice: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.regular,
    color: Palette.gray400,
    textDecorationLine: 'line-through',
  },
  discountChip: {
    backgroundColor: Palette.dangerTint,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  discountChipText: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
    color: Palette.danger,
  },
  stockWarning: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.medium,
    color: Palette.danger,
  },
  qtyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Palette.gray100,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 64,
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
});
