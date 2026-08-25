import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react-native';

import { CartItemHydrated } from '@celebs/shared-types';

import { getDiscountPercent, getUnitPrice } from '../utils/cart-selectors';

import { CartCheckbox } from './cart-checkbox';
import { styles } from './cart-item-card.styles';
import { CartPrice } from './cart-price';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { resolveImageUrl } from '@/features/products/hooks/use-products';

interface CartItemCardProps {
  item: CartItemHydrated;
  checked: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  onQuantityPress: () => void;
  onRemove: () => void;
}

export function CartItemCard({
  item,
  checked,
  isUpdating,
  onToggle,
  onQuantityPress,
  onRemove,
}: CartItemCardProps) {
  const discountPercent = getDiscountPercent(item);
  const variantLabel = [item.colorVariantName, item.size].filter(Boolean).join(' / ');

  return (
    <View style={styles.row}>
      <View style={styles.checkboxWrap}>
        <CartCheckbox
          checked={checked}
          onPress={onToggle}
          accessibilityLabel={`Select ${item.productName}`}
        />
      </View>

      <Image
        source={{ uri: resolveImageUrl(item.image || '') }}
        style={styles.thumbnail}
        contentFit="cover"
        transition={200}
      />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.productName} numberOfLines={2}>
            {item.productName}
          </ThemedText>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={onRemove}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.productName}`}
          >
            <Trash2 size={16} color={Palette.gray400} />
          </TouchableOpacity>
        </View>

        <View style={styles.variantRow}>
          <View style={[styles.colorDot, { backgroundColor: item.colorCode || Palette.gray300 }]} />
          <ThemedText style={styles.variantText} numberOfLines={1}>
            {variantLabel}
          </ThemedText>
          <ChevronRight size={12} color={Palette.gray400} />
        </View>

        <View style={styles.priceRow}>
          <View style={styles.priceGroup}>
            <CartPrice value={getUnitPrice(item)} color={Palette.danger} size="lg" />
            {discountPercent > 0 && (
              <>
                <ThemedText style={styles.strikePrice}>{item.price.toFixed(2)}</ThemedText>
                <View style={styles.discountChip}>
                  <ThemedText style={styles.discountChipText}>-{discountPercent}%</ThemedText>
                </View>
              </>
            )}
            {item.stockWarning ? (
              <ThemedText style={styles.stockWarning} numberOfLines={1}>
                {item.stockWarning}
              </ThemedText>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.qtyButton}
            onPress={onQuantityPress}
            disabled={isUpdating}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Change quantity, current ${item.quantity}`}
          >
            {isUpdating ? (
              <ThemedText style={styles.qtyText}>…</ThemedText>
            ) : (
              <>
                <ThemedText style={styles.qtyText}>{item.quantity}</ThemedText>
                <ChevronDown size={14} color={Palette.gray700} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
