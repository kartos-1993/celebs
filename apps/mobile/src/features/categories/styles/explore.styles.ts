import { StyleSheet } from 'react-native';

import { FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
    paddingTop: Spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  categoryList: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    padding: Spacing.lg,
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
  },
  cardContent: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: FontSize.body,
    fontWeight: '800',
  },
  cardPathText: {
    fontSize: FontSize.caption,
    color: Palette.gray400,
    marginTop: Spacing.xxs,
  },
});

export default styles;
