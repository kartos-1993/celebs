import { Platform, Dimensions, StatusBar as RNStatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

// Status bar height varies
export const STATUS_BAR_HEIGHT = IS_IOS ? 44 : RNStatusBar.currentHeight || 24;

// Standard UI constants
export const UI = {
  headerHeight: 60,
  tabBarHeight: 65,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  }
};

// Cross-platform shadow styles that can be applied in StyleSheet
// (Nativewind handles most of this via shadow-* classes, but good to have a fallback)
export const SHADOWS = {
  light: IS_IOS
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      }
    : {
        elevation: 2,
      },
  medium: IS_IOS
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      }
    : {
        elevation: 4,
      },
};
