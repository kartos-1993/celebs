import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.white,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.white,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray100,
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
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  emptySub: {
    fontSize: FontSize.small,
    color: Palette.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
  shopNowBtn: {
    backgroundColor: Palette.gray900,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xxl,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  shopNowBtnText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
  gridContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
});
