import { Dimensions, StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Palette.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    width: SCREEN_WIDTH,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  titleText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
  },
  subTitleText: {
    fontSize: FontSize.small,
    opacity: 0.6,
    marginTop: Spacing.xxs,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelSection: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
    opacity: 0.8,
  },
  sizePillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  sizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    minWidth: 54,
  },
  sizePillSelected: {
    backgroundColor: Palette.black,
  },
  sizePillUnselected: {
    backgroundColor: Palette.gray100,
  },
  sizeText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  sizeTextSelected: {
    color: Palette.white,
    fontWeight: FontWeight.extrabold,
  },
  sizeTextUnselected: {
    color: Palette.gray900,
  },
  confirmBtn: {
    backgroundColor: Palette.danger,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: Palette.white,
    fontSize: FontSize.body,
    fontWeight: FontWeight.extrabold,
  },
});
