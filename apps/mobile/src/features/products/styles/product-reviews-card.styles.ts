import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Palette.white,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Palette.gray900,
  },
  countText: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewMoreText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.gray700,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginVertical: 2,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.gray200,
  },
  chipText: {
    fontSize: 11,
    color: Palette.gray700,
  },
  previewReviewsContainer: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  previewItem: {
    gap: 2,
    paddingBottom: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray100,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewUser: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.semibold,
    color: Palette.gray800,
  },
  previewVariant: {
    fontSize: 11,
    color: Palette.gray400,
  },
  previewComment: {
    fontSize: FontSize.footnote,
    color: Palette.gray700,
    lineHeight: 16,
  },
  emptyText: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
    fontStyle: 'italic',
    paddingVertical: Spacing.xs,
  },
});
