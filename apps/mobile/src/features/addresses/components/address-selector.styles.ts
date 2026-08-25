import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.gray200,
    borderRadius: Radius.sm,
  },
  addressCardSelected: {
    borderWidth: 1.5,
    borderColor: Palette.gray900,
  },
  touchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.white,
  },
  radioOuterSelected: {
    borderColor: Palette.gray900,
    backgroundColor: Palette.gray900,
  },
  infoGroup: {
    flex: 1,
    gap: Spacing.xxs,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  labelChip: {
    backgroundColor: Palette.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  labelChipText: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
    color: Palette.gray700,
    letterSpacing: 0.5,
  },
  defaultBadge: {
    borderWidth: 1,
    borderColor: Palette.success,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.xs + 1,
    paddingVertical: 1,
  },
  defaultBadgeText: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
    color: Palette.success,
    letterSpacing: 0.5,
  },
  namePhone: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
  },
  addressLine: {
    fontSize: FontSize.caption,
    color: Palette.gray600,
    lineHeight: 16,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs + 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Palette.gray200,
  },
  editBtnText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.gray600,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.gray300,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
  },
  addRowText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
});
