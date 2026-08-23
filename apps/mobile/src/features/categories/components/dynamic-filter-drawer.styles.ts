import { StyleSheet } from 'react-native';

import { FontSize, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Palette.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    backgroundColor: Palette.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray100,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Palette.gray900,
  },
  closeBtn: {
    padding: Spacing.sm,
  },
  scrollBody: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Palette.gray700,
    marginBottom: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray100,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  chipSelected: {
    backgroundColor: Palette.brandTint,
    borderColor: Palette.brand,
  },
  chipText: {
    fontSize: FontSize.small,
    color: Palette.gray600,
  },
  chipTextSelected: {
    color: Palette.brand,
    fontWeight: '600',
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray100,
    borderWidth: 1,
    borderColor: Palette.gray200,
    gap: Spacing.sm,
  },
  colorChipSelected: {
    backgroundColor: Palette.brandTint,
    borderColor: Palette.brand,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sizeChip: {
    width: 44,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: Palette.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  sizeChipSelected: {
    backgroundColor: Palette.brandTint,
    borderColor: Palette.brand,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.gray100,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.gray300,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Palette.gray700,
  },
  applyBtn: {
    flex: 2,
    backgroundColor: Palette.brand,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Palette.white,
  },
});
