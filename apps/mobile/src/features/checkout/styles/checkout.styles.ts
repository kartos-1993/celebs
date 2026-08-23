import { StyleSheet } from 'react-native';

import {
  FontSize,
  FontWeight,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';

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
    paddingBottom: 100,
  },
  sectionCard: {
    backgroundColor: Palette.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  formGroup: {
    gap: Spacing.xs,
  },
  rowGroup: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  label: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.gray600,
  },
  input: {
    backgroundColor: Palette.gray50,
    borderWidth: 1,
    borderColor: Palette.gray300,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.base,
    color: Palette.gray900,
  },
  paymentOption: {
    borderWidth: 1.5,
    borderColor: Palette.gray200,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  paymentOptionSelected: {
    borderColor: Palette.brand,
    backgroundColor: Palette.brandTint,
  },
  paymentOptionDisabled: {
    backgroundColor: Palette.gray100,
    borderColor: Palette.gray200,
    opacity: 0.7,
  },
  paymentRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Palette.brand,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    backgroundColor: Palette.brand,
  },
  paymentName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  paymentDesc: {
    fontSize: FontSize.caption,
    color: Palette.gray500,
  },
  codWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.warningTint,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  codWarningText: {
    fontSize: FontSize.footnote,
    color: Palette.warning,
    fontWeight: FontWeight.semibold,
    flex: 1,
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
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.gray200,
    marginVertical: Spacing.xs,
  },
  totalLabel: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Palette.brand,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  securityText: {
    fontSize: FontSize.footnote,
    color: Palette.gray600,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Palette.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.gray200,
  },
  submitBtn: {
    backgroundColor: Palette.brand,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
  authNoticeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  authNoticeTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
    textAlign: 'center',
  },
  authNoticeDesc: {
    fontSize: FontSize.small,
    color: Palette.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.white,
    borderWidth: 1.5,
    borderColor: Palette.gray200,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    width: '100%',
    gap: Spacing.md,
    elevation: 1,
  },
  googleGLogo: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    backgroundColor: Palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGText: {
    color: Palette.white,
    fontSize: FontSize.small,
    fontWeight: FontWeight.black,
  },
  googleBtnText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
  },
  secondaryBtn: {
    paddingVertical: Spacing.md,
  },
  secondaryBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Palette.brand,
  },
});

export default styles;
