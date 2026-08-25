import { StyleSheet } from 'react-native';

import { Palette, Radius } from '@/constants/theme';

export const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  boxChecked: {
    backgroundColor: Palette.gray900,
  },
  boxUnchecked: {
    backgroundColor: Palette.white,
    borderWidth: 1.5,
    borderColor: Palette.gray300,
  },
});
