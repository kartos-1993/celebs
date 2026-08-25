import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
    backgroundColor: Palette.white,
  },

  /* ---------- Profile header ---------- */
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl - 4,
    gap: Spacing.md + 2,
  },
  avatarBadge: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Palette.white,
    fontSize: FontSize.headline,
    fontWeight: FontWeight.bold,
  },
  profileInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  userName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Palette.gray900,
  },
  userEmail: {
    fontSize: FontSize.small,
    color: Palette.gray500,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs + 1,
  },
  verifiedText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.success,
  },

  sectionBand: {
    height: Spacing.sm,
    backgroundColor: Palette.gray100,
  },

  /* ---------- Menu ---------- */
  menuGroup: {
    backgroundColor: Palette.white,
    paddingHorizontal: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 54,
  },
  menuItemDivided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray100,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md + 2,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Palette.gray900,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 54,
    backgroundColor: Palette.white,
  },
  logoutText: {
    color: Palette.danger,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.base,
  },

  /* ---------- Logged-out auth ---------- */
  authBanner: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  authTitle: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.extrabold,
    color: Palette.gray900,
  },
  authSub: {
    textAlign: 'center',
    fontSize: FontSize.small,
    color: Palette.gray500,
    paddingHorizontal: Spacing.xl,
    lineHeight: 19,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.white,
    borderWidth: 1.5,
    borderColor: Palette.gray200,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.lg - 2,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.gray200,
  },
  dividerText: {
    fontSize: FontSize.caption,
    color: Palette.gray400,
    marginHorizontal: Spacing.md,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: Palette.gray100,
    borderRadius: Radius.pill,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 1,
    alignItems: 'center',
    borderRadius: Radius.pill,
  },
  tabToggleActive: {
    backgroundColor: Palette.white,
  },
  tabToggleText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Palette.gray500,
  },
  tabToggleTextActive: {
    color: Palette.gray900,
  },
  formContainer: {
    gap: Spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.gray50,
    borderWidth: 1,
    borderColor: Palette.gray200,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: FontSize.base,
    color: Palette.gray900,
  },
  submitBtn: {
    backgroundColor: Palette.gray900,
    borderRadius: Radius.pill,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  submitBtnText: {
    color: Palette.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
