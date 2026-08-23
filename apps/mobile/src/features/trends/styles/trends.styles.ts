import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});

export default styles;
