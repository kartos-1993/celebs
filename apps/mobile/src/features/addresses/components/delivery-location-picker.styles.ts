import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  headerPlaceholder: {
    width: 24,
  },
  closeButton: {
    padding: Spacing.xxs,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  backButtonText: {
    fontSize: FontSize.small,
    color: Palette.gray600,
    marginLeft: Spacing.xxs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
  },
  errorText: {
    color: Palette.danger,
    fontSize: FontSize.footnote,
    marginTop: Spacing.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  itemRowActive: {
    backgroundColor: Palette.gray200,
  },
  itemTextContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  itemName: {
    fontSize: FontSize.base,
    color: Palette.gray900,
  },
  itemHint: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
    marginTop: 2,
  },
  emptyText: {
    fontSize: FontSize.small,
    color: Palette.gray400,
    paddingVertical: Spacing.xl,
    textAlign: 'center',
  },
});
