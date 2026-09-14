import { Dimensions, StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Palette.black ?? '#000000',
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  counterText: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
  variantText: {
    fontSize: FontSize.footnote,
    color: Palette.gray300,
  },
  scrollableComment: {
    maxHeight: 72,
    marginVertical: 2,
  },
  commentText: {
    fontSize: FontSize.caption,
    color: Palette.gray100,
    lineHeight: 18,
  },
  cartBtn: {
    backgroundColor: Palette.white,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxs,
  },
  cartBtnText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  galleryHelpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  galleryHelpfulBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  galleryHelpfulText: {
    fontSize: 11,
    color: Palette.gray300,
  },
  galleryHelpfulTextActive: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
});
