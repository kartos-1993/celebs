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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.gray50,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginVertical: Spacing.sm,
  },
  badgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  badgeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.sm,
  },
  flagshipPill: {
    backgroundColor: Palette.accentTint,
  },
  flagshipText: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
    color: Palette.accent,
  },
  verifiedPill: {
    backgroundColor: Palette.successTint,
  },
  verifiedText: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
    color: Palette.success,
  },
  genericPill: {
    backgroundColor: Palette.gray100,
  },
  genericText: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.semibold,
    color: Palette.gray600,
  },
  brandTitle: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
    flexShrink: 1,
  },
  storyLink: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.semibold,
    color: Palette.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Palette.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Palette.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Palette.gray900,
  },
  closeButton: {
    padding: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Palette.gray100,
  },
  tierBanner: {
    backgroundColor: Palette.successTint,
    borderWidth: 1,
    borderColor: Palette.success,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  tierBannerText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.success,
    textAlign: 'center',
  },
  storyBody: {
    gap: Spacing.md,
  },
  storySubtitle: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.gray700,
  },
  storyText: {
    fontSize: FontSize.caption,
    lineHeight: 18,
    color: Palette.gray500,
  },
  trustHighlights: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.gray100,
    gap: Spacing.md,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  highlightEmoji: {
    fontSize: FontSize.lg,
  },
  highlightTitle: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  highlightDesc: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
  },
});
