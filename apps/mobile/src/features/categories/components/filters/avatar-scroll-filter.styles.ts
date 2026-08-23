import { StyleSheet } from 'react-native';

import { FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  avatarItem: {
    alignItems: 'center',
    width: 64,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Palette.gray200,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRingSelected: {
    borderColor: Palette.brand,
    borderWidth: 2.5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.pill,
  },
  avatarLabel: {
    marginTop: Spacing.sm,
    fontSize: FontSize.footnote,
    fontWeight: '500',
    color: Palette.gray500,
    textAlign: 'center',
  },
  avatarLabelSelected: {
    color: Palette.brand,
    fontWeight: '700',
  },
});
