import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.gray50,
  },
  pageHeader: {
    backgroundColor: Palette.white,
  },
  section: {
    flex: 1,
    minHeight: 0,
  },
  footerGroup: {
    backgroundColor: Palette.white,
    borderTopWidth: 1,
    borderTopColor: Palette.gray100,
  },
  stockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.dangerTint,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  stockNoticeText: {
    fontSize: FontSize.caption,
    color: Palette.danger,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.white,
  },
  loadingText: {
    fontSize: FontSize.small,
    color: Palette.gray500,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Palette.black,
    marginBottom: Spacing.xs,
  },
  emptyDescription: {
    fontSize: FontSize.small,
    color: Palette.gray500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  exploreBtn: {
    backgroundColor: Palette.black,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  exploreBtnText: {
    color: Palette.white,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.small,
  },
});
