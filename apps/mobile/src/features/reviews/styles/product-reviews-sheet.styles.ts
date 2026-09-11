import { StyleSheet } from 'react-native';

import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: '90%',
    backgroundColor: Palette.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray200,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  reviewItem: {
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray100,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  dateText: {
    fontSize: FontSize.footnote,
    color: Palette.gray400,
  },
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  variantText: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
  },
  buySameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    backgroundColor: Palette.gray50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.gray300,
  },
  buySameText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  commentText: {
    fontSize: FontSize.caption,
    color: Palette.gray800,
    lineHeight: 18,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: Radius.xs,
    backgroundColor: Palette.gray100,
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.caption,
    color: Palette.gray500,
  },
});
