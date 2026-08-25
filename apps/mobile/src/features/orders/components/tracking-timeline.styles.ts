import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  emptyText: {
    fontSize: FontSize.caption,
    color: Palette.gray500,
    lineHeight: 18,
    paddingVertical: Spacing.sm,
  },
  eventRow: {
    flexDirection: 'row',
  },
  rail: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray200,
    marginTop: 3,
    borderWidth: 2,
    borderColor: Palette.gray200,
  },
  dotFilled: {
    backgroundColor: Palette.gray900,
    borderColor: Palette.gray900,
  },
  dotDanger: {
    backgroundColor: Palette.danger,
    borderColor: Palette.danger,
  },
  dotPulseRing: {
    width: 14,
    height: 14,
    borderColor: Palette.success,
    borderWidth: 2,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Palette.gray200,
    marginVertical: 2,
  },
  lineFilled: {
    backgroundColor: Palette.gray300,
  },
  content: {
    flex: 1,
    paddingLeft: Spacing.md,
    gap: Spacing.xxs,
  },
  contentSpaced: {
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Palette.gray700,
    lineHeight: 18,
  },
  titleActive: {
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  description: {
    fontSize: FontSize.caption,
    color: Palette.gray600,
    lineHeight: 17,
  },
  timestamp: {
    fontSize: FontSize.footnote,
    color: Palette.gray400,
  },
});
