import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.white,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray200,
  },
  headerIconSlot: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  listContent: {
    paddingVertical: Spacing.sm,
    flexGrow: 1,
  },

  /* ---------- States ---------- */
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  loadingText: {
    fontSize: FontSize.small,
    color: Palette.gray500,
  },
  errorText: {
    fontSize: FontSize.small,
    color: Palette.danger,
    textAlign: 'center',
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: Palette.gray900,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
  },
  retryBtnText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  emptySub: {
    fontSize: FontSize.caption,
    color: Palette.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
  shopNowBtn: {
    backgroundColor: Palette.gray900,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  shopNowBtnText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
  footerSpinner: {
    paddingVertical: Spacing.lg,
  },
});
