import { StyleSheet } from 'react-native';

import { FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: 100,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarBadge: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray900,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  avatarText: {
    color: Palette.white,
    fontSize: FontSize.headline,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: FontSize.small,
    marginBottom: Spacing.xs,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  verifiedText: {
    fontSize: FontSize.caption,
    color: Palette.success,
    fontWeight: '600',
  },
  sectionContainer: {
    backgroundColor: Palette.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Palette.gray400,
    letterSpacing: 0.8,
    marginBottom: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray100,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Palette.gray900,
  },
  menuItemSub: {
    fontSize: FontSize.caption,
    marginTop: Spacing.xxs,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.dangerTint,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
  },
  logoutText: {
    color: Palette.danger,
    fontWeight: '600',
    fontSize: FontSize.body,
  },
  authBanner: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  authTitle: {
    fontSize: FontSize.title,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  authSub: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontSize: FontSize.small,
    paddingHorizontal: Spacing.xl,
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
    marginBottom: Spacing.xl,
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
    fontWeight: '900',
  },
  googleBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Palette.gray900,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.gray200,
  },
  dividerText: {
    fontSize: FontSize.caption,
    color: Palette.gray400,
    marginHorizontal: Spacing.md,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: Palette.gray200,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabToggleActive: {
    backgroundColor: Palette.white,
  },
  tabToggleText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Palette.gray500,
  },
  tabToggleTextActive: {
    color: Palette.gray900,
  },
  formContainer: {
    gap: Spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.gray300,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: FontSize.body,
    color: Palette.gray900,
  },
  submitBtn: {
    backgroundColor: Palette.gray900,
    borderRadius: Radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnText: {
    color: Palette.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});

export default styles;
