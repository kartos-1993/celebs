import { StyleSheet } from 'react-native';

import { FontSize, FontWeight } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currency: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.bold,
    paddingBottom: 1,
  },
  integerLg: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
  },
  integerMd: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
  },
  cents: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.extrabold,
    paddingBottom: 1,
  },
});
