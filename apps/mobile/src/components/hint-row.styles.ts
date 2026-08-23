import { StyleSheet } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  codeSnippet: {
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
  },
});
