import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray200,
    gap: Spacing.md,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: Radius.sm,
    backgroundColor: Palette.gray100,
  },
  headerInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  currentPrice: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.black,
    color: Palette.danger,
  },
  originalPrice: {
    fontSize: FontSize.small,
    color: Palette.gray400,
    textDecorationLine: 'line-through',
  },
  selectedVariantText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    color: Palette.gray600,
  },
  closeBtn: {
    padding: Spacing.xs,
    alignSelf: 'flex-start',
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  sizeGuideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  sizeGuideText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.gray500,
  },

  sizePillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm + 2,
    marginBottom: Spacing.lg,
  },
  sizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    height: 38,
    borderRadius: Radius.sm,
    minWidth: 54,
    borderWidth: 1.5,
  },
  sizePillSelected: {
    backgroundColor: Palette.gray900,
    borderColor: Palette.gray900,
  },
  sizePillUnselected: {
    backgroundColor: Palette.white,
    borderColor: Palette.gray300,
  },
  sizePillDisabled: {
    backgroundColor: Palette.gray100,
    borderColor: Palette.gray200,
    opacity: 0.45,
  },

  sizeText: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.bold,
  },
  sizeTextSelected: {
    color: Palette.white,
    fontWeight: FontWeight.extrabold,
  },
  sizeTextUnselected: {
    color: Palette.gray900,
  },
  sizeTextDisabled: {
    color: Palette.gray400,
    textDecorationLine: 'line-through',
  },

  confirmBtn: {
    backgroundColor: Palette.gray900,
    borderRadius: Radius.pill,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    color: Palette.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
