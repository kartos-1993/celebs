import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Minus, Plus, Trash2 } from 'lucide-react-native';

import { CartItemHydrated } from '@celebs/shared-types';

import { styles } from './cart-item-list.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { resolveImageUrl } from '@/features/products/hooks/use-products';

interface CartItemListProps {
  items: CartItemHydrated[];
  updatingId: string | null;
  onIncrement: (itemId: string, currentQty: number, maxStock: number) => void;
  onDecrement: (itemId: string, currentQty: number) => void;
  onRemove: (itemId: string) => void;
}

export const CartItemList: React.FC<CartItemListProps> = ({
  items,
  updatingId,
  onIncrement,
  onDecrement,
  onRemove,
}) => {
  return (
    <View style={styles.container}>
      {items.map((item) => {
        const itemId = item.id;
        const isUpdating = updatingId === itemId;
        const imageUrl = resolveImageUrl(item.image || '');

        return (
          <View key={itemId} style={styles.card}>
            {/* Thumbnail */}
            <Image
              source={{ uri: imageUrl }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
            />

            {/* Item Details */}
            <View style={styles.infoContainer}>
              <ThemedText style={styles.productName} numberOfLines={2}>
                {item.productName}
              </ThemedText>

              <View style={styles.metaRow}>
                {item.size ? (
                  <ThemedText style={styles.metaBadge}>Size: {item.size}</ThemedText>
                ) : null}
                {item.colorVariantName ? (
                  <ThemedText style={styles.metaBadge}>Color: {item.colorVariantName}</ThemedText>
                ) : null}
              </View>

              <View style={styles.priceRow}>
                <ThemedText style={styles.priceText}>Rs. {item.price.toLocaleString()}</ThemedText>

                {/* Quantity Controls */}
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => onDecrement(itemId, item.quantity)}
                    disabled={isUpdating}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease quantity"
                  >
                    <Minus size={14} color={Palette.gray700} />
                  </TouchableOpacity>

                  {isUpdating ? (
                    <ActivityIndicator size="small" color={Palette.brand} style={styles.qtySpinner} />
                  ) : (
                    <ThemedText style={styles.qtyText}>{item.quantity}</ThemedText>
                  )}

                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => onIncrement(itemId, item.quantity, item.availableStock)}
                    disabled={isUpdating || item.quantity >= item.availableStock}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Increase quantity"
                  >
                    <Plus size={14} color={Palette.gray700} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Remove Icon */}
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemove(itemId)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Remove item"
            >
              <Trash2 size={18} color={Palette.gray400} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};
