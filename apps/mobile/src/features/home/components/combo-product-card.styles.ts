import { StyleSheet } from 'react-native';

import { FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
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
  collage: {
    height: 150,
    flexDirection: 'row',
    backgroundColor: Palette.gray100,
  },
  collageImage: {
    flex: 1,
    height: '100%',
  },
  collagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsPill: {
    position: 'absolute',
    left: Spacing.sm,
    bottom: Spacing.sm,
    backgroundColor: Palette.accent,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  savingsText: {
    color: Palette.white,
    fontSize: FontSize.micro,
    fontWeight: '800',
  },
  body: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.small,
    fontWeight: '700',
    color: Palette.gray900,
  },
  meta: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
  },
  addButton: {
    marginTop: Spacing.xs,
    backgroundColor: Palette.accentTint,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  addButtonText: {
    color: Palette.accent,
    fontSize: FontSize.caption,
    fontWeight: '800',
  },
});
