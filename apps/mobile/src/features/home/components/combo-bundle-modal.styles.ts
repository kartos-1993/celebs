import { StyleSheet } from 'react-native';

import { FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Palette.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Palette.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray100,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Palette.gray900,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  scrollBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  savingsBanner: {
    backgroundColor: Palette.success,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  savingsBannerText: {
    color: Palette.white,
    fontSize: FontSize.caption,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: FontSize.caption,
    color: Palette.gray500,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: Palette.gray50,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSize.small,
    fontWeight: '700',
    color: Palette.gray900,
  },
  itemOriginalPrice: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
    marginTop: Spacing.xxs,
  },
  selectorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  selectorLabel: {
    fontSize: FontSize.footnote,
    fontWeight: '700',
    color: Palette.gray600,
    width: 42,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.gray300,
  },
  chipSelected: {
    backgroundColor: Palette.accent,
    borderColor: Palette.accent,
  },
  chipText: {
    fontSize: FontSize.footnote,
    fontWeight: '600',
    color: Palette.gray700,
  },
  chipTextSelected: {
    color: Palette.white,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.gray100,
    backgroundColor: Palette.white,
  },
  originalTotalStrike: {
    fontSize: FontSize.caption,
    color: Palette.gray400,
    textDecorationLine: 'line-through',
  },
  finalTotal: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Palette.success,
  },
  addCartBtn: {
    backgroundColor: Palette.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  addCartBtnText: {
    color: Palette.white,
    fontSize: FontSize.small,
    fontWeight: '800',
  },
});
