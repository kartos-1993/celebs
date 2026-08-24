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
    flex: 1,
    backgroundColor: Palette.white,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Palette.gray500,
  },
  errorText: {
    fontSize: FontSize.body,
    color: Palette.danger,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    backgroundColor: Palette.gray900,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
  },
  backBtnText: {
    color: Palette.white,
    fontWeight: FontWeight.semibold,
  },

  /* ---------- Solid Header ---------- */
  headerBar: {
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    height: 48,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSearchPill: {
    flex: 1,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginHorizontal: Spacing.xs,
  },
  headerSearchText: {
    fontSize: FontSize.small,
    color: Palette.gray400,
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: Spacing.xxs,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Palette.danger,
    borderRadius: Radius.pill,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  cartBadgeText: {
    color: Palette.white,
    fontSize: FontSize.micro,
    fontWeight: FontWeight.extrabold,
  },

  /* ---------- Scroll Sections ---------- */
  scrollContent: {
    paddingBottom: 110,
  },
  detailsContainer: {
    paddingHorizontal: Spacing.lg,
  },
  sectionBand: {
    height: Spacing.sm,
    backgroundColor: Palette.gray100,
    marginVertical: Spacing.md,
  },
  productTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Palette.gray800,
    lineHeight: 21,
    flexShrink: 1,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  ratingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingInlineText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Palette.gray700,
  },

  /* ---------- Price ---------- */
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  currentPrice: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.extrabold,
    color: Palette.gray900,
  },
  originalPrice: {
    fontSize: FontSize.base,
    color: Palette.gray400,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: Palette.dangerTint,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.xs,
  },
  discountText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.danger,
  },

  /* ---------- Section Headers ---------- */
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
    marginBottom: Spacing.sm,
  },

  /* ---------- Shipping / Service Rows ---------- */
  shippingSection: {
    marginBottom: Spacing.xs,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  serviceRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray100,
  },
  serviceText: {
    flex: 1,
    fontSize: FontSize.small,
    color: Palette.gray700,
  },
  serviceHighlight: {
    color: Palette.success,
    fontWeight: FontWeight.bold,
  },

  /* ---------- Reviews ---------- */
  reviewsSection: {
    marginBottom: Spacing.xs,
  },
  reviewsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reviewsScore: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Palette.gray900,
  },
  reviewsCount: {
    fontSize: FontSize.small,
    color: Palette.gray500,
  },
  reviewsViewMore: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  reviewsViewMoreText: {
    fontSize: FontSize.small,
    color: Palette.gray500,
  },
  reviewsEmpty: {
    fontSize: FontSize.small,
    color: Palette.gray400,
    marginTop: Spacing.md,
  },

  /* ---------- Description ---------- */
  descriptionSection: {
    marginBottom: Spacing.lg,
  },
  descriptionText: {
    fontSize: FontSize.small,
    color: Palette.gray600,
    lineHeight: 21,
  },

  /* ---------- Bottom Sticky Bar ---------- */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Palette.white,
    borderTopWidth: 1,
    borderTopColor: Palette.gray100,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  wishlistBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Palette.white,
  },
  addToCartBtn: {
    flex: 1,
    backgroundColor: Palette.gray900,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    height: 48,
    borderRadius: Radius.pill,
  },
  addToCartText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
});

export default styles;
