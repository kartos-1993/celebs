import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';

import type { OrderItemView } from '../utils/order-status';

import { ThemedText } from '@/components/themed-text';
import { resolveImageUrl } from '@/constants/config';
import { FontSize, FontWeight, Palette, Radius } from '@/constants/theme';

interface OrderCardItemViewProps {
  items: OrderItemView[];
}

export function OrderCardItemView({ items }: OrderCardItemViewProps) {
  if (items.length === 0) return null;

  if (items.length === 1) {
    const item = items[0]!;
    const variantParts = [
      item.colorVariantName,
      item.size ? `Size ${item.size}` : '',
      `Qty: ${item.quantity}`,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <View style={styles.singleRow}>
        <View style={styles.thumbBox}>
          {item.imageUrl ? (
            <Image
              source={{ uri: resolveImageUrl(item.imageUrl) }}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <ShoppingBag size={18} color={Palette.gray400} />
          )}
        </View>

        <View style={styles.singleInfo}>
          <View style={styles.singleTopRow}>
            <ThemedText style={styles.singleTitle} numberOfLines={1}>
              {item.productName}
            </ThemedText>
            <ThemedText style={styles.singlePrice}>
              Rs. {item.unitPrice.toLocaleString()}
            </ThemedText>
          </View>
          <ThemedText style={styles.singleVariant} numberOfLines={1}>
            {variantParts}
          </ThemedText>
        </View>
      </View>
    );
  }

  // Multi-item order: horizontal thumbnail strip (SHEIN / Daraz signature)
  const maxVisible = 4;
  const showMoreBox = items.length > maxVisible;
  const visibleItems = showMoreBox ? items.slice(0, maxVisible - 1) : items.slice(0, maxVisible);
  const remainingCount = items.length - (maxVisible - 1);

  return (
    <View style={styles.multiRow}>
      {visibleItems.map((item) => (
        <View key={item.id} style={styles.multiThumbBox}>
          {item.imageUrl ? (
            <Image
              source={{ uri: resolveImageUrl(item.imageUrl) }}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <ShoppingBag size={16} color={Palette.gray400} />
          )}
        </View>
      ))}

      {showMoreBox && (
        <View style={styles.moreBox}>
          <ThemedText style={styles.moreText}>+{remainingCount}</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  singleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  thumbBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.gray900,
  },
  singlePrice: {
    fontSize: FontSize.caption,
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
    gap: 6,
    marginVertical: 4,
  },
  multiThumbBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  moreBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.xs,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Palette.gray600,
  },
});
