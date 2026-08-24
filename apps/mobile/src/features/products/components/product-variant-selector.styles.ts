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
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  valueText: {
    fontWeight: FontWeight.regular,
    color: Palette.gray600,
  },
  variantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  /* ---------- Color Swatches ---------- */
  colorChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Palette.white,
  },
  colorChipSelected: {
    borderWidth: 2,
    borderColor: Palette.gray900,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  colorThumbnail: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm - 1,
  },

  /* ---------- Size Boxes ---------- */
  sizeBox: {
    minWidth: 40,
    height: 28,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Palette.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.gray100,
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
    fontSize: FontSize.footnote,
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

  /* ---------- Measurement Box ---------- */
  measurementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F8',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  measurementTextWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.sm,
    rowGap: Spacing.xxs,
  },
  measurementText: {
    fontSize: FontSize.micro,
    color: Palette.gray600,
    lineHeight: 14,
  },
  measurementLabel: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
    color: Palette.gray800,
  },

  /* ---------- Size Guide Links ---------- */
  sizeGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.md,
  },
  sizeGuideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sizeGuideText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
  },

  /* ---------- Stock Notices ---------- */
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
