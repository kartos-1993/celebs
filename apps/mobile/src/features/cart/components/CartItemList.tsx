import React from 'react';
import { ActivityIndicator,StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Minus, Plus, Trash2 } from 'lucide-react-native';

import { CartItemHydrated } from '@celebs/shared-types';

import { ThemedText } from '@/components/themed-text';
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
                    <Minus size={14} color="#374151" />
                  </TouchableOpacity>

                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#208AEF" style={styles.qtySpinner} />
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
                    <Plus size={14} color="#374151" />
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
              <Trash2 size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingVertical: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  thumbnail: {
    width: 80,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    height: 100,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181b',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaBadge: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18181b',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181b',
    paddingHorizontal: 8,
  },
  qtySpinner: {
    paddingHorizontal: 8,
  },
  removeBtn: {
    padding: 8,
    alignSelf: 'flex-start',
  },
});
