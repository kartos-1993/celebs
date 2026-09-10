import React from 'react';
import { Image, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';

import type { OrderItemView } from '../utils/order-status';

import { styles } from './order-card-item-view.styles';

import { ThemedText } from '@/components/themed-text';
import { resolveImageUrl } from '@/constants/config';
import { Palette } from '@/constants/theme';

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
