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
  rowDisabled: {
    backgroundColor: Palette.gray50,
  },
  checkboxWrap: {
    paddingTop: Spacing.xs,
  },
  thumbnailWrap: {
    width: 88,
    height: 88,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Palette.gray100,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailOos: {
    opacity: 0.5,
  },
  oosOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 5,
  },
  oosBadge: {
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  oosBadgeText: {
    color: Palette.white,
    fontSize: 8,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.3,
  },
  oosTag: {
    color: Palette.danger,
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
    backgroundColor: Palette.dangerTint,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
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
  qtyButtonDisabled: {
    opacity: 0.45,
  },
  qtyText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
});
