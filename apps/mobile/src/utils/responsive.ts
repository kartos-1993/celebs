import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Standard design reference width (e.g. 375dp for standard mobile viewport)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Linear scale relative to screen width
 */
export const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;

/**
 * Linear scale relative to screen height
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;

/**
 * Moderate scale with dampening factor so sizes scale gracefully without becoming micro/huge
 */
export const moderateScale = (size: number, factor = 0.4) => size + (scale(size) - size) * factor;

/**
 * Responsive font size clamped to pixel density
 */
export const responsiveFontSize = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(moderateScale(size, 0.3)));

/**
 * Responsive icon dimension
 */
export const responsiveIconSize = (size: number) => Math.round(moderateScale(size, 0.25));

export { SCREEN_HEIGHT, SCREEN_WIDTH };
