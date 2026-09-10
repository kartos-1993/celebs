import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.white,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray100,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.lg,
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.md,
  },
  sectionHeader: {
    fontSize: FontSize.caption + 1,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  codWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.warningTint,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 8,
  },
  codWarningText: {
    fontSize: FontSize.footnote,
    color: Palette.warning,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  footer: {
    backgroundColor: Palette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.gray200,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLabel: {
    fontSize: FontSize.small,
    color: Palette.gray500,
  },
  subtotalValue: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  totalLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  totalValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.black,
    color: '#f95738',
  },
});
