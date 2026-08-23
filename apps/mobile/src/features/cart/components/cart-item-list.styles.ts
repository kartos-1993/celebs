import { StyleSheet } from 'react-native';

import {
  FontSize,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Palette.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.gray100,
  },
  thumbnail: {
    width: 80,
    height: 100,
    borderRadius: Radius.sm,
    backgroundColor: Palette.gray100,
  },
  infoContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'space-between',
    height: 100,
  },
  productName: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Palette.gray900,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metaBadge: {
    fontSize: FontSize.caption,
    color: Palette.gray500,
    backgroundColor: Palette.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Palette.gray900,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.gray100,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  qtyBtn: {
    padding: Spacing.sm,
  },
  qtyText: {
    fontSize: FontSize.small,
    fontWeight: '700',
    color: Palette.gray900,
    paddingHorizontal: Spacing.sm,
  },
  qtySpinner: {
    paddingHorizontal: Spacing.sm,
  },
  removeBtn: {
    padding: Spacing.sm,
    alignSelf: 'flex-start',
  },
});
