import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius } from '@/constants/theme';

export const styles = StyleSheet.create({
  singleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  thumbBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  singleInfo: {
    flex: 1,
    gap: 2,
  },
  singleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  singleTitle: {
    flex: 1,
    fontSize: FontSize.caption + 1,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
  },
  singlePrice: {
    fontSize: FontSize.caption + 1,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  singleVariant: {
    fontSize: 11,
    color: Palette.gray500,
  },
  multiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  multiThumbBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  moreBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Palette.gray700,
  },
});
