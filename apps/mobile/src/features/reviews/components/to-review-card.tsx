import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Star } from 'lucide-react-native';

import type { ToReviewItem } from '../types';

import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/features/orders/utils/order-status';

interface ToReviewCardProps {
  item: ToReviewItem;
  onPressReview: (item: ToReviewItem) => void;
}

export function ToReviewCard({ item, onPressReview }: ToReviewCardProps) {
  const variantText = [item.colorVariantName, item.size].filter(Boolean).join(' / ');

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText style={styles.orderNo}>Order {item.orderNumber}</ThemedText>
        <ThemedText style={styles.deliveredText}>
          Delivered {item.deliveredAt ? formatDate(item.deliveredAt) : ''}
        </ThemedText>
      </View>

      <View style={styles.bodyRow}>
        <Image
          source={{ uri: item.productImage }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.infoCol}>
          <ThemedText numberOfLines={2} style={styles.title}>
            {item.productName}
          </ThemedText>
          {!!variantText && <ThemedText style={styles.variantText}>{variantText}</ThemedText>}
          <ThemedText style={styles.priceText}>
            Rs. {item.unitPrice.toLocaleString()} × {item.quantity}
          </ThemedText>
        </View>
      </View>

      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => onPressReview(item)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Write a review for ${item.productName}`}
        >
          <Star size={13} color={Palette.white} fill={Palette.white} />
          <ThemedText style={styles.reviewBtnText}>Review Item</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray200,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNo: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
  },
  deliveredText: {
    fontSize: FontSize.footnote,
    color: Palette.success,
    fontWeight: FontWeight.semibold,
  },
  bodyRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  image: {
    width: 68,
    height: 68,
    borderRadius: Radius.xs,
    backgroundColor: Palette.gray100,
  },
  infoCol: {
    flex: 1,
    gap: Spacing.xxs,
  },
  title: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    color: Palette.gray900,
    lineHeight: 18,
  },
  variantText: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
  },
  priceText: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.semibold,
    color: Palette.gray800,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: Spacing.xs,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.gray900,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
  },
  reviewBtnText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
});
