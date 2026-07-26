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
  categoriesGrid: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    height: moderateScale(270),
    alignContent: 'flex-start',
    gap: moderateScale(8),
  },
  categoryItem: {
    width: moderateScale(66),
    alignItems: 'center',
    marginRight: moderateScale(8),
    marginBottom: moderateScale(6),
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

