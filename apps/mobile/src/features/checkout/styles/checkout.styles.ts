import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  /* ---------- Shell ---------- */
  container: {
    flex: 1,
    backgroundColor: Palette.white,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.white,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray100,
  },
  headerIconSlot: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
    backgroundColor: Palette.white,
  },
  sectionBand: {
    height: Spacing.sm,
    backgroundColor: Palette.gray100,
  },
  detailsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    gap: Spacing.md,
  },

  /* ---------- Items strip ---------- */
  itemsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemsCountText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  itemsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  itemThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.gray200,
    backgroundColor: Palette.gray50,
    overflow: 'hidden',
  },
  itemThumb: {
    width: '100%',
    height: '100%',
  },
  itemQtyBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: Palette.gray900,
    borderTopLeftRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  itemQtyText: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },

  /* ---------- Section headers ---------- */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },

  /* ---------- Address ---------- */
  addrHint: {
    fontSize: FontSize.caption,
    color: Palette.gray500,
  },

  /* ---------- Payment ---------- */
  paymentList: {},
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md + 2,
  },
  rowDivided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray100,
  },
  paymentInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.white,
  },
  radioOuterSelected: {
    borderColor: Palette.gray900,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray900,
  },
  paymentName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
  },
  paymentDesc: {
    fontSize: FontSize.caption,
    color: Palette.gray500,
  },
  comingSoonTag: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
    color: Palette.gray400,
    letterSpacing: 0.5,
  },
  codWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.warningTint,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  codWarningText: {
    fontSize: FontSize.footnote,
    color: Palette.warning,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },

  /* ---------- Summary ---------- */
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FontSize.small,
    color: Palette.gray500,
  },
  summaryValue: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
  },
  freeShippingText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.success,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.gray200,
    marginVertical: Spacing.xxs,
  },
  totalRowGap: {
    marginTop: Spacing.xs,
  },
  totalLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Palette.gray900,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  securityText: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
  },

  /* ---------- Bottom action bar (normal flow — never absolute) ---------- */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.gray100,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  barTotalsGroup: {
    flex: 1,
    gap: 2,
  },
  barCaption: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
  },
  barTotalPrice: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Palette.danger,
  },
  placeBtn: {
    backgroundColor: Palette.gray900,
    borderRadius: Radius.pill,
    minHeight: 48,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeBtnDisabled: {
    opacity: 0.4,
  },
  placeBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },

  /* ---------- Logged-out notice ---------- */
  authNoticeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  authNoticeTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
    textAlign: 'center',
  },
  authNoticeDesc: {
    fontSize: FontSize.small,
    color: Palette.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.white,
    borderWidth: 1.5,
    borderColor: Palette.gray200,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.lg - 2,
    width: '100%',
    gap: Spacing.md,
  },
  googleGLogo: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    backgroundColor: Palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGText: {
    color: Palette.white,
    fontSize: FontSize.small,
    fontWeight: FontWeight.black,
  },
  googleBtnText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
  },
  secondaryBtnText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Palette.gray700,
    textDecorationLine: 'underline',
  },
});
