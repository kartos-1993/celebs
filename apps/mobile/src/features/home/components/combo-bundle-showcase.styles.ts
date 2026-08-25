import { StyleSheet } from 'react-native';

import { FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  headerRow: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Palette.gray900,
  },
  sectionSubtitle: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
    marginTop: 1,
  },
  scrollPadding: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    width: 260,
    backgroundColor: Palette.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.gray200,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  imageBox: {
    width: '100%',
    height: 130,
    position: 'relative',
    backgroundColor: Palette.gray100,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  tagBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(24, 24, 27, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  tagBadgeText: {
    color: Palette.white,
    fontSize: FontSize.micro,
    fontWeight: '800',
  },
  savingsPill: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Palette.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  savingsPillText: {
    color: Palette.white,
    fontSize: FontSize.micro,
    fontWeight: '900',
  },
  cardBody: {
    padding: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Palette.gray900,
  },
  cardSubtitle: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
    marginTop: Spacing.xxs,
    height: 30,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Palette.gray100,
  },
  itemsCount: {
    fontSize: FontSize.micro,
    fontWeight: '700',
    color: Palette.gray500,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  viewBtnText: {
    fontSize: FontSize.footnote,
    fontWeight: '800',
    color: Palette.accent,
  },
});
