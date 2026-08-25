import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray100,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  orderCard: {
    backgroundColor: Palette.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNo: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
    fontFamily: 'monospace',
  },
  orderDate: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
    marginTop: Spacing.xxs,
  },
  badge: {
    backgroundColor: Palette.brandTint,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  badgeText: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.bold,
    color: Palette.brand,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.gray50,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  productIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  productVariant: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
  },
  amountText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.brand,
    marginTop: Spacing.xxs,
  },
  trackerContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  trackerHeaderTitle: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.gray600,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCol: {
    alignItems: 'center',
    gap: Spacing.xs,
    width: 60,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotPassed: {
    backgroundColor: Palette.success,
  },
  stepLabel: {
    fontSize: FontSize.micro,
    color: Palette.gray400,
    textAlign: 'center',
  },
  stepLabelPassed: {
    color: Palette.success,
    fontWeight: FontWeight.bold,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Palette.gray200,
    marginBottom: Spacing.lg,
  },
  stepLinePassed: {
    backgroundColor: Palette.success,
  },
  courierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.accentTint,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  courierText: {
    fontSize: FontSize.footnote,
    color: Palette.accent,
  },
  trackingNo: {
    fontWeight: FontWeight.bold,
    fontFamily: 'monospace',
  },
});

export default styles;
