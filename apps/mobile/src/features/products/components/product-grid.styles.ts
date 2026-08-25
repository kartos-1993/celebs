import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xxs,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.3,
  },
  filterBar: {
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  chipButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    marginRight: Spacing.xs,
  },
  chipActive: {
    backgroundColor: Palette.black,
  },
  chipText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
  },
  chipTextActive: {
    color: Palette.white,
    fontWeight: FontWeight.bold,
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.sm,
    opacity: 0.6,
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Palette.brand,
    borderRadius: Radius.sm,
  },
  retryText: {
    color: Palette.white,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.small,
  },
  paginationFooter: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
  },
  loadMoreText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
  },
});
