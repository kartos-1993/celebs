import { StyleSheet } from 'react-native';

import {
  FontSize,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Palette.gray50,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FontSize.base,
    color: Palette.gray500,
  },
  summaryValue: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Palette.gray900,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.gray200,
    marginVertical: Spacing.xs,
  },
  totalLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Palette.gray900,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Palette.brand,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  trustText: {
    fontSize: FontSize.caption,
    color: Palette.gray700,
  },
  checkoutBtn: {
    backgroundColor: Palette.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  checkoutBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Palette.white,
  },
});
