import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  totalsGroup: {
    flex: 1,
    gap: 2,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  strikeTotal: {
    fontSize: FontSize.caption,
    color: Palette.gray400,
    textDecorationLine: 'line-through',
    paddingBottom: 2,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  savingsLabel: {
    fontSize: FontSize.footnote,
    color: Palette.gray600,
  },
  savingsValue: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.bold,
    color: Palette.danger,
  },
  checkoutBtn: {
    backgroundColor: Palette.gray900,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnDisabled: {
    opacity: 0.4,
  },
  checkoutBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
});
