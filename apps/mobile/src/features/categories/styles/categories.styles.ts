import { StyleSheet } from 'react-native';

import {
  FontSize,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { moderateScale, responsiveFontSize } from '@/utils/responsive';

export const styles = StyleSheet.create({
  categoriesSection: {
    marginBottom: Spacing.xl,
  },
  categoriesScrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  categoriesRowWrapper: {
    flexDirection: 'row',
    gap: moderateScale(Spacing.md),
  },
  categoryColumn: {
    flexDirection: 'column',
    gap: moderateScale(Spacing.md),
  },
  categoryItem: {
    width: moderateScale(66),
    alignItems: 'center',
  },
  categoryImageContainer: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray100,
    overflow: 'hidden',
    marginBottom: moderateScale(Spacing.xs),
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryName: {
    fontSize: responsiveFontSize(FontSize.footnote),
    lineHeight: responsiveFontSize(FontSize.small),
    textAlign: 'center',
    fontWeight: '500',
    color: Palette.gray700,
    minHeight: responsiveFontSize(26),
  },
});
