import React from 'react';
import { Image, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';

import type { OrderItemView } from '../utils/order-status';
import { getItemStatusMeta } from '../utils/order-status';

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
  const displayImage = imageUrl ?? item.imageUrl;
  const variantLine = [item.colorVariantName, item.size ? `Size ${item.size}` : '']
    .filter(Boolean)
    .join(' · ');
  const statusMeta = getItemStatusMeta(item.itemStatus);
  const showStatusTag = item.itemStatus !== 'PENDING';

  return (
    <View style={[styles.row, !isLast && styles.rowDivided]}>
      <View style={styles.thumbBox}>
        {displayImage ? (
          <Image
            source={{ uri: resolveImageUrl(displayImage) }}
            style={styles.thumb}
            resizeMode="cover"
            accessible={true}
            accessibilityLabel={item.productName}
          />
        ) : (
          <ShoppingBag size={24} color={Palette.gray400} />
        )}
      </View>

      <View style={styles.info}>
        {item.vendorName ? (
          <ThemedText style={styles.qty} numberOfLines={1}>
            Seller: {item.vendorName}
          </ThemedText>
        ) : null}

        <ThemedText style={styles.name} numberOfLines={2}>
          {item.productName}
        </ThemedText>

        {variantLine ? (
          <View style={styles.variantBadge}>
            <ThemedText style={styles.variantText} numberOfLines={1}>
              {variantLine}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.priceRow}>
          <ThemedText style={styles.price}>Rs. {item.unitPrice.toLocaleString()}</ThemedText>
          <ThemedText style={styles.qty}>Qty: {item.quantity}</ThemedText>
        </View>

        {showStatusTag && (
          <ThemedText
            style={[
              styles.cancelledTag,
              item.itemStatus === 'HANDED_OVER' && { color: Palette.brand },
              item.itemStatus === 'DELIVERED' && { color: Palette.success },
              item.itemStatus === 'PACKED' && { color: Palette.gray700 },
            ]}
          >
            {statusMeta.label.toUpperCase()}
            {item.trackingNumber ? ` · ${item.trackingNumber}` : ''}
          </ThemedText>
        )}
      </View>
    </View>
  );
}
