import React from 'react';
import { Image, Text, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';

import type { OrderItemView } from '../utils/order-status';

import { styles } from './order-item-row.styles';

import { ThemedText } from '@/components/themed-text';
import { resolveImageUrl } from '@/constants/config';
import { Palette } from '@/constants/theme';

interface OrderItemRowProps {
  item: OrderItemView;
  imageUrl?: string | null;
  isLast?: boolean;
}

export function OrderItemRow({ item, imageUrl, isLast }: OrderItemRowProps) {
  const variantLine = [item.colorVariantName, `Size ${item.size}`].filter(Boolean).join(' · ');

  return (
    <View style={[styles.row, !isLast && styles.rowDivided]}>
      <View style={styles.thumbBox}>
        {imageUrl ? (
          <Image
            source={{ uri: resolveImageUrl(imageUrl) }}
            style={styles.thumb}
            resizeMode="cover"
            accessible={true}
            accessibilityLabel={item.productName}
          />
        ) : (
          <ShoppingBag size={20} color={Palette.gray400} />
        )}
      </View>

      <View style={styles.info}>
        <ThemedText style={styles.name} numberOfLines={2}>
          {item.productName}
        </ThemedText>
        <ThemedText style={styles.meta} numberOfLines={1}>
          {variantLine} · Qty {item.quantity}
        </ThemedText>
        {item.itemStatus === 'CANCELLED' && (
          <ThemedText style={styles.cancelledTag}>ITEM CANCELLED</ThemedText>
        )}
      </View>

      <Text style={styles.price}>Rs. {item.subtotal.toLocaleString()}</Text>
    </View>
  );
}
