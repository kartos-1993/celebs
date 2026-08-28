import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

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
  colorChipDisabled: {
    opacity: 0.42,
  },
  colorChipDisabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: Radius.sm - 1,
  },
  colorChipDisabledLine: {
    position: 'absolute',
    width: '120%',
    height: 1,
    backgroundColor: Palette.gray400,
    transform: [{ rotate: '-36deg' }],
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
    minWidth: 42,
    height: 32,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.sm,
    backgroundColor: Palette.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Palette.gray300,
  },
  sizeBoxSelected: {
    backgroundColor: Palette.gray900,
    borderColor: Palette.gray900,
  },
  sizeBoxDisabled: {
    backgroundColor: Palette.gray100,
    borderColor: Palette.gray200,
    opacity: 0.45,
  },
  sizeBoxLowStock: {
    borderColor: Palette.warning,
    backgroundColor: Palette.warningTint,
    minHeight: 40,
    paddingVertical: 4,
  },
  sizeBoxInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeText: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  sizeTextSelected: {
    color: Palette.white,
    fontWeight: FontWeight.extrabold,
  },
  sizeTextDisabled: {
    color: Palette.gray400,
    textDecorationLine: 'line-through',
  },
  sizeTextLowStock: {
    color: Palette.warning,
  },
  sizeLowStockTag: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Palette.warning,
    lineHeight: 10,
    marginTop: 1,
  },
  sizeLowStockTagSelected: {
    color: Palette.white,
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
});
