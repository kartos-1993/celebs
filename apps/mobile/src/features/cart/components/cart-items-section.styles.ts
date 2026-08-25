import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: Palette.gray50,
  },
  chipsArea: {
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray100,
  },
  chipsRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  brandMenu: {
    backgroundColor: Palette.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  brandMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  brandMenuText: {
    flex: 1,
    fontSize: FontSize.small,
    color: Palette.gray800,
  },
  brandMenuTextSelected: {
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  brandMenuDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray900,
    marginLeft: Spacing.sm,
  },
  listContent: {
    gap: 0,
  },
  emptyFilterBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyFilterText: {
    fontSize: FontSize.small,
    color: Palette.gray500,
    textAlign: 'center',
  },
});
