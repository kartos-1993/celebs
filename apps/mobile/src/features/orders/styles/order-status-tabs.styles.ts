import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray200,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  tab: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {},
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.medium,
    color: Palette.gray600,
  },
  tabTextActive: {
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: Palette.gray900,
    borderRadius: 2,
  },
  badge: {
    backgroundColor: Palette.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeNeutral: {
    backgroundColor: Palette.gray700,
  },
  badgeText: {
    color: Palette.white,
    fontSize: 10,
    fontWeight: FontWeight.bold,
    lineHeight: 12,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
