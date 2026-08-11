import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { moderateScale, responsiveFontSize } from '@/utils/responsive';

export const styles = StyleSheet.create({
  categoriesSection: {
    marginBottom: Spacing.four,
  },
  categoriesScrollContent: {
    paddingHorizontal: Spacing.four,
  },
  categoriesRowWrapper: {
    flexDirection: 'row',
    gap: moderateScale(10),
  },
  categoryColumn: {
    flexDirection: 'column',
    gap: moderateScale(10),
  },
  categoryItem: {
    width: moderateScale(66),
    alignItems: 'center',
  },
  categoryImageContainer: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    marginBottom: moderateScale(4),
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryName: {
    fontSize: responsiveFontSize(10.5),
    lineHeight: responsiveFontSize(13),
    textAlign: 'center',
    fontWeight: '500',
    color: '#374151',
    minHeight: responsiveFontSize(26),
  },
});
