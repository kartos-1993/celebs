import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
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
    padding: Spacing.xxs,
  },
  formContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  chipSelectorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chipOption: {
    borderWidth: 1,
    borderColor: Palette.gray200,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Palette.white,
  },
  chipOptionActive: {
    borderColor: Palette.gray900,
    backgroundColor: Palette.gray900,
  },
  chipOptionText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Palette.gray700,
  },
  chipOptionTextActive: {
    color: Palette.white,
  },
  sectionHint: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
    color: Palette.gray400,
    letterSpacing: 0.8,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Palette.gray50,
    borderWidth: 1,
    borderColor: Palette.gray200,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    fontSize: FontSize.base,
    color: Palette.gray900,
  },
  multilineInput: {
    minHeight: 68,
    textAlignVertical: 'top',
    paddingTop: Spacing.md - 2,
  },
  rowGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  flexInput: {
    flex: 1,
  },
  errorText: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.semibold,
    color: Palette.danger,
    marginTop: -(Spacing.md - 2),
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  switchLabels: {
    flex: 1,
    paddingRight: Spacing.md,
    gap: Spacing.xxs,
  },
  switchTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
  },
  switchSub: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: Palette.danger,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    height: 48,
  },
  deleteBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.danger,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Palette.gray900,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  saveBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
