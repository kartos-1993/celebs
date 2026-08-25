import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ChevronRight, Store } from 'lucide-react-native';

import { CartItemHydrated } from '@celebs/shared-types';

import { CartCheckbox } from './cart-checkbox';
import { CartItemCard } from './cart-item-card';
import { styles } from './shop-cart-group.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ShopCartGroupProps {
  brand: string;
  items: CartItemHydrated[];
  selectedItemIds: string[];
  updatingId: string | null;
  onToggleItem: (itemId: string) => void;
  onToggleShop: (itemIds: string[], selected: boolean) => void;
  onQuantityPress: (item: CartItemHydrated) => void;
  onRemoveItem: (itemId: string) => void;
}

export function ShopCartGroup({
  brand,
  items,
  selectedItemIds,
  updatingId,
  onToggleItem,
  onToggleShop,
  onQuantityPress,
  onRemoveItem,
}: ShopCartGroupProps) {
  const itemIds = items.map((item) => item.id);
  const allSelected = items.every((item) => selectedItemIds.includes(item.id));

  return (
    <View style={styles.group}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => onToggleShop(itemIds, !allSelected)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityState={{ selected: allSelected }}
        accessibilityLabel={`Select all ${brand} items`}
      >
        <CartCheckbox checked={allSelected} onPress={() => onToggleShop(itemIds, !allSelected)} />
        <Store size={16} color={Palette.gray900} />
        <ThemedText style={styles.brandName} numberOfLines={1}>
          {brand}
        </ThemedText>
        <ChevronRight size={15} color={Palette.gray400} />
      </TouchableOpacity>

      <View style={styles.itemsWrapper}>
        {items.map((item) => (
          <CartItemCard
            key={item.id}
            item={item}
            checked={selectedItemIds.includes(item.id)}
            isUpdating={updatingId === item.id}
            onToggle={() => onToggleItem(item.id)}
            onQuantityPress={() => onQuantityPress(item)}
            onRemove={() => onRemoveItem(item.id)}
          />
        ))}
      </View>
    </View>
  );
}
