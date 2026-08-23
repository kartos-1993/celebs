import { Platform } from 'react-native';

export const Palette = {
  white: '#FFFFFF',
  black: '#000000',

  brand: '#208AEF',
  brandPressed: '#0274DF',
  brandTint: '#E8F3FE',

  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#18181B',

  success: '#16A34A',
  successTint: '#DCFCE7',
  danger: '#DC2626',
  dangerTint: '#FEF2F2',
  warning: '#D97706',
  warningTint: '#FEF3C7',
  gold: '#EAB308',
  accent: '#7C3AED',
  accentTint: '#EDE9FE',

  overlay: 'rgba(17, 24, 39, 0.5)',
  overlaySoft: 'rgba(17, 24, 39, 0.05)',
} as const;

export const Colors = {
  light: {
    text: Palette.gray900,
    textPrimary: Palette.gray900,
    textSecondary: Palette.gray500,
    textTertiary: Palette.gray400,
    textInverse: Palette.white,
    background: Palette.white,
    backgroundSubtle: Palette.gray50,
    surface: Palette.gray100,
    surfaceSelected: Palette.gray200,
    border: Palette.gray200,
    brand: Palette.brand,
    brandPressed: Palette.brandPressed,
    brandTint: Palette.brandTint,
    onBrand: Palette.white,
    success: Palette.success,
    successTint: Palette.successTint,
    danger: Palette.danger,
    dangerTint: Palette.dangerTint,
    warning: Palette.warning,
    warningTint: Palette.warningTint,
    accent: Palette.accent,
    accentTint: Palette.accentTint,
    overlay: Palette.overlay,
    tabInactive: Palette.gray600,

    backgroundElement: Palette.gray100,
    backgroundSelected: Palette.gray200,
  },
  dark: {
    text: Palette.white,
    textPrimary: Palette.white,
    textSecondary: Palette.gray400,
    textTertiary: Palette.gray500,
    textInverse: Palette.gray900,
    background: Palette.black,
    backgroundSubtle: Palette.gray900,
    surface: Palette.gray800,
    surfaceSelected: Palette.gray700,
    border: Palette.gray700,
    brand: Palette.brand,
    brandPressed: Palette.brandPressed,
    brandTint: 'rgba(32, 138, 239, 0.15)' as string,
    onBrand: Palette.white,
    success: Palette.success,
    successTint: 'rgba(22, 163, 74, 0.15)' as string,
    danger: '#F87171' as string,
    dangerTint: 'rgba(220, 38, 38, 0.15)' as string,
    warning: '#FBBF24' as string,
    warningTint: 'rgba(217, 119, 6, 0.15)' as string,
    accent: '#A78BFA' as string,
    accentTint: 'rgba(124, 58, 237, 0.15)' as string,
    overlay: Palette.overlay,
    tabInactive: Palette.gray400,

    backgroundElement: Palette.gray800,
    backgroundSelected: Palette.gray700,
  },
};

export type SchemeColor = keyof typeof Colors.light;
export type ThemeColor = SchemeColor;

export const FontSize = {
  micro: 10,
  footnote: 11,
  caption: 12,
  small: 13,
  base: 14,
  body: 15,
  md: 16,
  lg: 18,
  xl: 20,
  title: 22,
  headline: 24,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 64,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const MaxContentWidth = 800;
