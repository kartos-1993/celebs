import { StyleSheet } from 'react-native';

import { FontSize, Palette, Radius } from '@/constants/theme';

export const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.gray50,
    borderWidth: 1,
    borderColor: Palette.gray200,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    height: 48,
  },
  leadingIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Palette.gray900,
    paddingVertical: 0,
  },
  toggleBtn: {
    paddingLeft: 10,
    paddingVertical: 10,
  },
});
