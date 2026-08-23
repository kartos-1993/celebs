import { StyleSheet } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pressedHeading: {
    opacity: 0.7,
  },
  button: {
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    marginLeft: Spacing.xl,
    padding: Spacing.xl,
  },
});
