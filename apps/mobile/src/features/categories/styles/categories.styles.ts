import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

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
    height: 275, // Fits exactly 3 rows with the new spacing
    alignContent: 'flex-start',
    gap: 8,
  },
  categoryItem: {
    width: 60,
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 6,
  },
  categoryImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    marginBottom: 4,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryName: {
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 10,
    fontWeight: '400',
    height: 20, // Forces alignment across 2 lines of text
  },
});
