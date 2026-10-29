import { StyleSheet } from 'react-native';

import { FontWeight, Palette, Radius } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.white,
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  orderDate: {
    fontSize: 11,
    color: Palette.gray400,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F8FAFC',
    marginVertical: 4,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  trackingText: {
    flex: 1,
    fontSize: 11,
    fontWeight: FontWeight.medium,
    color: Palette.gray700,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F8FAFC',
  },
  totalLabel: {
    fontSize: 12,
    color: Palette.gray600,
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: FontWeight.black,
    color: Palette.gray900,
  },
  itemCount: {
    fontSize: 11,
    color: Palette.gray400,
  },
});
