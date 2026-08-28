import React from 'react';
import { Image, View } from 'react-native';

import type { CartItemHydrated } from '@celebs/shared-types';

import { styles } from '../styles/checkout.styles';

import { ThemedText } from '@/components/themed-text';

interface CheckoutItemsStripProps {
  items: CartItemHydrated[];
  itemsCount: number;
}

export function CheckoutItemsStrip({ items, itemsCount }: CheckoutItemsStripProps) {
  return (
    <View style={styles.detailsContainer}>
      <View style={styles.itemsHeaderRow}>
        <ThemedText style={styles.itemsCountText}>
          {itemsCount} item{itemsCount === 1 ? '' : 's'}
        </ThemedText>
      </View>
      <View style={styles.itemsRow}>
        {items.map((item) => (
          <View key={item.id} style={styles.itemThumbWrap}>
            <Image
              source={{ uri: item.image }}
              style={styles.itemThumb}
              resizeMode="cover"
              accessible={true}
              accessibilityLabel={item.productName}
            />
            <View style={styles.itemQtyBadge}>
              <ThemedText style={styles.itemQtyText}>×{item.quantity}</ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
