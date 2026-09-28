import React from 'react';
import { View } from 'react-native';

import type { CartItemHydrated } from '@celebs/shared-types';

import { styles } from '../styles/checkout.styles';

import { MobileApparelImage } from '@/components/mobile-apparel-image';
import { ThemedText } from '@/components/themed-text';
import { useCartLineProduct } from '@/features/cart/hooks/use-cart-line-product';
import { resolveCartLineImage } from '@/features/cart/utils/cart-selectors';

interface CheckoutItemsStripProps {
  items: CartItemHydrated[];
  itemsCount: number;
}

/**
 * One checkout line's thumbnail. A dedicated component so each row can own its
 * own product query (hooks cannot be called in a `.map`), and so the strip
 * resolves the SAME live image the cart does rather than the frozen
 * `item.image` snapshot.
 */
const CheckoutItemThumb = React.memo(function CheckoutItemThumb({
  item,
}: {
  item: CartItemHydrated;
}) {
  const { data: product } = useCartLineProduct(item.productId);
  const displayImage = resolveCartLineImage(item, product);

  return (
    <View style={styles.itemThumbWrap}>
      <MobileApparelImage
        src={displayImage}
        preset="thumbnail"
        containerStyle={styles.itemThumb}
        alt={item.productName}
      />
      <View style={styles.itemQtyBadge}>
        <ThemedText style={styles.itemQtyText}>×{item.quantity}</ThemedText>
      </View>
    </View>
  );
});

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
          <CheckoutItemThumb key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}
