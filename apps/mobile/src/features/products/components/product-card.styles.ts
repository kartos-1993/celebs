import { StyleSheet } from 'react-native';

import {
  FontSize,
  FontWeight,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { moderateScale, responsiveFontSize } from '@/utils/responsive';

export const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: Radius.sm,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    position: 'relative',
    overflow: 'hidden',
  },
  imageScrollView: {
    width: '100%',
    height: '100%',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Palette.gray100,
  },

  paginationDotsContainer: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    zIndex: 4,
  },
  paginationDot: {
    height: 3.5,
    borderRadius: 2,
  },
  paginationDotActive: {
    width: 10,
    backgroundColor: Palette.white,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 1,
  },
  paginationDotInactive: {
    width: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },

  heartButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 25,
    height: 25,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },

  imageColorCapsule: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Palette.overlay,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    gap: 4,
    zIndex: 5,
  },
  capsuleColorDot: {
    width: 14,
    height: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    overflow: 'hidden',
  },
  capsuleColorDotActive: {
    borderColor: Palette.white,
    borderWidth: 2,
    transform: [{ scale: 1.15 }],
  },
  capsuleCountText: {
    fontSize: FontSize.micro,
    lineHeight: 8.5,
    fontWeight: FontWeight.extrabold,
    color: Palette.white,
    marginTop: 0.5,
    textAlign: 'center',
  },
  capsuleSwatchImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.pill,
  },

  detailsContainer: {
    padding: Spacing.sm,
    paddingTop: Spacing.xs,
  },

  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xxs,
  },
  trendsBadge: {
    backgroundColor: Palette.accentTint,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: 1,
    borderRadius: 2,
  },
  trendsText: {
    color: Palette.accent,
    fontSize: responsiveFontSize(FontSize.micro),
    fontWeight: FontWeight.extrabold,
    fontStyle: 'italic',
    lineHeight: responsiveFontSize(10),
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: 1,
    borderRadius: 2,
  },
  storeText: {
    fontSize: responsiveFontSize(FontSize.micro),
    fontWeight: FontWeight.bold,
    lineHeight: responsiveFontSize(10),
  },

  productName: {
    fontSize: responsiveFontSize(FontSize.caption),
    fontWeight: FontWeight.regular,
    lineHeight: responsiveFontSize(15),
    marginBottom: Spacing.xxs,
  },

  bottomPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: Spacing.xxs,
  },
  priceLeftCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xxs,
    flexWrap: 'nowrap',
    flex: 1,
    marginRight: Spacing.xs,
  },
  mainPriceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: responsiveFontSize(FontSize.micro),
    fontWeight: FontWeight.extrabold,
    marginRight: 1,
  },
  integerPrice: {
    fontSize: responsiveFontSize(FontSize.body),
    fontWeight: FontWeight.black,
    lineHeight: responsiveFontSize(16.5),
  },
  decimalPrice: {
    fontSize: responsiveFontSize(FontSize.micro),
    fontWeight: FontWeight.extrabold,
  },

  discountTagPill: {
    backgroundColor: Palette.dangerTint,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: 0.5,
    borderRadius: 2,
    marginLeft: Spacing.xxs,
  },
  discountTagText: {
    color: Palette.warning,
    fontSize: responsiveFontSize(FontSize.micro),
    lineHeight: responsiveFontSize(9.5),
    fontWeight: FontWeight.extrabold,
  },

  cartActionButton: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
