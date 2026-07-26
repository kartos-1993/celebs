import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { responsiveFontSize } from '@/utils/responsive';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = 'default',
  themeColor,
  maxFontSizeMultiplier = 1.25,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: responsiveFontSize(14),
    lineHeight: responsiveFontSize(20),
    fontWeight: '500',
  },
  smallBold: {
    fontSize: responsiveFontSize(14),
    lineHeight: responsiveFontSize(20),
    fontWeight: '700',
  },
  default: {
    fontSize: responsiveFontSize(15),
    lineHeight: responsiveFontSize(22),
    fontWeight: '500',
  },
  title: {
    fontSize: responsiveFontSize(36),
    fontWeight: '600',
    lineHeight: responsiveFontSize(42),
  },
  subtitle: {
    fontSize: responsiveFontSize(24),
    lineHeight: responsiveFontSize(32),
    fontWeight: '600',
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
