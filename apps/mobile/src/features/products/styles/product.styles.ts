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
    backgroundColor: Palette.brand,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
  },
  backBtnText: {
    color: Palette.white,
    fontWeight: FontWeight.semibold,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Palette.danger,
    borderRadius: Radius.pill,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  cartBadgeText: {
    color: Palette.white,
    fontSize: FontSize.micro,
    fontWeight: FontWeight.extrabold,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  detailsContainer: {
    padding: Spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  brandText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  currentPrice: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.extrabold,
    color: Palette.gray900,
  },
  originalPrice: {
    fontSize: FontSize.md,
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  ratingText: {
    fontSize: FontSize.small,
    color: Palette.gray500,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.gray100,
    marginVertical: Spacing.lg,
  },
  descriptionSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
    marginBottom: Spacing.sm,
  },
  descriptionText: {
    fontSize: FontSize.base,
    color: Palette.gray600,
    lineHeight: 22,
  },
  valuePropsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Palette.gray50,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  propBox: {
    alignItems: 'center',
    flex: 1,
  },
  propTitle: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
    marginTop: Spacing.sm,
  },
  propSub: {
    fontSize: FontSize.micro,
    color: Palette.gray500,
    marginTop: Spacing.xxs,
  },
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
  },
  addToCartBtn: {
    backgroundColor: Palette.brand,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  addToCartText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
});

export default styles;
