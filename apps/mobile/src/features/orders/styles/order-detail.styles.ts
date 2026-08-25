import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
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

  /* ---------- Hero ---------- */
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTextActive: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.extrabold,
    color: Palette.gray900,
  },
  statusTextSuccess: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.extrabold,
    color: Palette.success,
  },
  statusTextWarning: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.extrabold,
    color: Palette.warning,
  },
  statusTextDanger: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.extrabold,
    color: Palette.danger,
  },
  statusTextNeutral: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.extrabold,
    color: Palette.gray700,
  },
  dateText: {
    fontSize: FontSize.caption,
    color: Palette.gray500,
  },
  orderNo: {
    fontSize: FontSize.footnote,
    color: Palette.gray600,
    letterSpacing: 0.4,
  },
  etaText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.success,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.success,
  },
  liveText: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.semibold,
    color: Palette.success,
  },

  /* ---------- Sections ---------- */
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

  /* ---------- Courier card ---------- */
  courierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.gray50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.gray200,
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  courierInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  courierName: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  courierWaybill: {
    fontSize: FontSize.footnote,
    color: Palette.gray600,
  },
  iconAction: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.gray200,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---------- Summary ---------- */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.gray200,
    marginVertical: Spacing.xxs,
  },
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
  freeText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.success,
  },
  discountValue: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Palette.danger,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    flex: 1,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.gray600,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Palette.danger,
  },

  /* ---------- Address ---------- */
  addressName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  addressLine: {
    fontSize: FontSize.caption,
    color: Palette.gray600,
    lineHeight: 17,
  },

  /* ---------- States ---------- */
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  loadingText: {
    fontSize: FontSize.small,
    color: Palette.gray500,
  },
  errorText: {
    fontSize: FontSize.small,
    color: Palette.danger,
    textAlign: 'center',
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: Palette.gray900,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
  },
  retryBtnText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
});
