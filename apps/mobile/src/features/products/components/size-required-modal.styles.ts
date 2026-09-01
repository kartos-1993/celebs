import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray100,
    gap: Spacing.md,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Palette.gray100,
  },
  headerInfo: {
    flex: 1,
    gap: Spacing.xxs,
    justifyContent: 'center',
  },
  productName: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Palette.gray800,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  currentPrice: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
    color: Palette.gray900,
  },
  originalPrice: {
    fontSize: FontSize.caption,
    color: Palette.gray400,
    textDecorationLine: 'line-through',
  },
  selectedVariantText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    color: Palette.gray500,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    height: 42,
    borderRadius: Radius.md,
    minWidth: 56,
    borderWidth: 1.5,
  },
  sizePillSelected: {
    backgroundColor: Palette.gray900,
    borderColor: Palette.gray900,
  },
  sizePillUnselected: {
    backgroundColor: Palette.white,
    borderColor: Palette.gray200,
  },
  sizePillDisabled: {
    backgroundColor: Palette.gray50,
    borderColor: Palette.gray200,
    opacity: 0.4,
  },

  sizeText: {
    fontSize: FontSize.small,
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

  footerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  confirmBtn: {
    backgroundColor: Palette.gray900,
    borderRadius: Radius.pill,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    color: Palette.white,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
});
