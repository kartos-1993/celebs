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
});
