import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    zIndex: 100,
  },
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.sm,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.black,
    letterSpacing: 4,
  },
  subHeaderContainer: {
    height: 38,
    width: '100%',
  },
  subScrollContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
  },
  subTabButton: {
    paddingHorizontal: Spacing.lg,
    height: '100%',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
  },
  subTabActiveText: {
    fontWeight: FontWeight.bold,
  },
  cartBadge: {
    position: 'absolute',
    top: Spacing.xxs,
    right: Spacing.xxs,
    backgroundColor: Palette.danger,
    minWidth: 16,
    height: 16,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: Palette.white,
    fontSize: FontSize.micro,
    fontWeight: FontWeight.extrabold,
  },
});
