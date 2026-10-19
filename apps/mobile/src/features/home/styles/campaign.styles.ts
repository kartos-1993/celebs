import { StyleSheet } from 'react-native';

import { FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Palette.gray900,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: Radius.pill,
    backgroundColor: Palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: Palette.white,
    fontSize: FontSize.micro,
    fontWeight: '800',
  },
  hero: {
    margin: Spacing.md,
    minHeight: 180,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroImage: {
    borderRadius: Radius.lg,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.65,
  },
  heroContent: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  heroEyebrow: {
    color: Palette.white,
    fontSize: FontSize.micro,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    color: Palette.white,
    fontSize: FontSize.headline,
    fontWeight: '900',
  },
  heroTagline: {
    color: Palette.white,
    fontSize: FontSize.small,
  },
  heroCountdown: {
    color: Palette.white,
    fontSize: FontSize.footnote,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  stateTitle: {
    color: Palette.gray600,
    fontSize: FontSize.base,
    textAlign: 'center',
  },
  emptyText: {
    color: Palette.gray500,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  footer: {
    paddingVertical: Spacing.md,
  },
});
