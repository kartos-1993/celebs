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
  sectionBand: {
    height: Spacing.sm,
    backgroundColor: Palette.gray100,
  },

  /* ---------- Order card ---------- */
  orderCard: {
    backgroundColor: Palette.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  statusTextActive: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  statusTextSuccess: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.success,
  },
  statusTextWarning: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.warning,
  },
  statusTextDanger: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.danger,
  },
  statusTextNeutral: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray700,
  },
  dateText: {
    fontSize: FontSize.caption,
    color: Palette.gray500,
  },

  /* ---------- Footer ---------- */
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.gray100,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xxs,
    gap: Spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: FontSize.caption,
    color: Palette.gray600,
  },
  totalValue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.extrabold,
    color: Palette.danger,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  liveHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs + 1,
    flex: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.success,
  },
  liveHintText: {
    fontSize: FontSize.micro,
    color: Palette.success,
    fontWeight: FontWeight.semibold,
  },
  trackBtn: {
    borderWidth: 1,
    borderColor: Palette.gray900,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm - 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
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
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  emptySub: {
    fontSize: FontSize.small,
    color: Palette.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
  shopNowBtn: {
    backgroundColor: Palette.gray900,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xxl,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  shopNowBtnText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
  footerSpinner: {
    paddingVertical: Spacing.lg,
  },
});
