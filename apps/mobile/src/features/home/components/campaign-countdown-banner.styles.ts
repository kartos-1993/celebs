import { StyleSheet } from 'react-native';

import { FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  bannerBackground: {
    width: '100%',
    minHeight: 180,
    justifyContent: 'center',
  },
  backgroundImageStyle: {
    borderRadius: Radius.lg,
  },
  colorOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.88,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  badgeText: {
    color: Palette.white,
    fontSize: FontSize.micro,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  titleText: {
    color: Palette.white,
    fontSize: FontSize.xl,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  taglineText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: FontSize.caption,
    fontWeight: '500',
    marginTop: Spacing.xxs,
    marginBottom: Spacing.md,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  countdownBox: {
    backgroundColor: Palette.white,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    minWidth: 42,
  },
  countdownNum: {
    color: Palette.gray900,
    fontSize: FontSize.base,
    fontWeight: '800',
  },
  countdownLabel: {
    color: Palette.gray500,
    fontSize: FontSize.micro,
    fontWeight: '700',
  },
  colonText: {
    color: Palette.white,
    fontSize: FontSize.md,
    fontWeight: '900',
    marginHorizontal: Spacing.xs,
  },
  shopBtn: {
    backgroundColor: Palette.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
  },
  shopBtnText: {
    color: Palette.danger,
    fontSize: FontSize.caption,
    fontWeight: '800',
  },
});
