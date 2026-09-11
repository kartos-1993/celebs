import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '90%',
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  policyBanner: {
    backgroundColor: Palette.gray50,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.gray200,
  },
  policyText: {
    fontSize: FontSize.footnote,
    color: Palette.gray600,
    lineHeight: 16,
  },
  ratingSection: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  ratingPrompt: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.gray800,
  },
  fitSection: {
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  fitOptionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fitOptionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.gray300,
    alignItems: 'center',
  },
  fitOptionBtnActive: {
    borderColor: Palette.gray900,
    backgroundColor: Palette.gray900,
  },
  fitOptionText: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.medium,
    color: Palette.gray700,
  },
  fitOptionTextActive: {
    color: Palette.white,
    fontWeight: FontWeight.bold,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Palette.gray300,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    fontSize: FontSize.caption,
    color: Palette.gray900,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: Palette.gray900,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
});
