import { Dimensions, StyleSheet } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 1.33;

export const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: Palette.gray100,
    position: 'relative',
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorDotActive: {
    width: 18,
    backgroundColor: Palette.white,
    borderRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Palette.black,
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.xxxl,
    right: Spacing.xl,
    zIndex: 10,
    padding: Spacing.sm,
  },
  zoomSlide: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
});
