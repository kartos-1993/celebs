import { StyleSheet } from 'react-native';

import { Fonts, FontSize, FontWeight, Palette } from '@/constants/theme';
import { responsiveFontSize } from '@/utils/responsive';

export const styles = StyleSheet.create({
  small: {
    fontSize: responsiveFontSize(FontSize.base),
    lineHeight: responsiveFontSize(FontSize.xl),
    fontWeight: FontWeight.medium,
  },
  smallBold: {
    fontSize: responsiveFontSize(FontSize.base),
    lineHeight: responsiveFontSize(FontSize.xl),
    fontWeight: FontWeight.bold,
  },
  default: {
    fontSize: responsiveFontSize(FontSize.body),
    lineHeight: responsiveFontSize(FontSize.title),
    fontWeight: FontWeight.medium,
  },
  title: {
    fontSize: responsiveFontSize(36),
    fontWeight: FontWeight.semibold,
    lineHeight: responsiveFontSize(42),
  },
  subtitle: {
    fontSize: responsiveFontSize(FontSize.headline),
    lineHeight: responsiveFontSize(32),
    fontWeight: FontWeight.semibold,
  },
  link: {
    lineHeight: 30,
    fontSize: FontSize.base,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: FontSize.base,
    color: Palette.brand,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: FontWeight.medium,
    fontSize: FontSize.caption,
  },
});
