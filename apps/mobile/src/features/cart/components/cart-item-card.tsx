import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react-native';

import { CartItemHydrated } from '@celebs/shared-types';

import { useCartLineProduct } from '../hooks/use-cart-line-product';
import { getDiscountPercent, getUnitPrice, resolveCartLineImage } from '../utils/cart-selectors';

import { CartCheckbox } from './cart-checkbox';
import { styles } from './cart-item-card.styles';
import { CartPrice } from './cart-price';

import { MobileApparelImage } from '@/components/mobile-apparel-image';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

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
  const isOutOfStock = !item.isAvailable || item.availableStock <= 0;
  const discountPercent = getDiscountPercent(item);
  const variantLabel = [item.colorVariantName, item.size].filter(Boolean).join(' / ');

  // The thumbnail is resolved from the CURRENT product, never from the frozen
  // `item.image` snapshot (empty on the optimistic row, stale after a gallery
  // swap). `displayImage` is `undefined` only when the product genuinely has no
  // picture, which renders the neutral tile instead of a broken image.
  const { data: product } = useCartLineProduct(item.productId);
  const displayImage = resolveCartLineImage(item, product);

  return (
    <View style={[styles.row, isOutOfStock && styles.rowDisabled]}>
      <View style={styles.checkboxWrap}>
        <CartCheckbox
          checked={!isOutOfStock && checked}
          onPress={isOutOfStock ? undefined : onToggle}
          disabled={isOutOfStock}
          accessibilityLabel={`Select ${item.productName}`}
        />
      </View>

      <View style={styles.thumbnailWrap}>
        <MobileApparelImage
          src={displayImage}
          preset="thumbnail"
          containerStyle={[styles.thumbnail, isOutOfStock && styles.thumbnailOos]}
          contentFit="cover"
          alt={`${item.productName} thumbnail`}
        />
        {isOutOfStock && (
          <View style={styles.oosOverlay} pointerEvents="none">
            <View style={styles.oosBadge}>
              <ThemedText style={styles.oosBadgeText}>OUT OF STOCK</ThemedText>
            </View>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <ThemedText
            style={[styles.productName, isOutOfStock && { color: Palette.gray500 }]}
            numberOfLines={2}
          >
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
          <ThemedText style={styles.variantText} numberOfLines={1}>
            {variantLabel}
          </ThemedText>
          <ChevronRight size={12} color={Palette.gray400} />
        </View>

        <View style={styles.priceRow}>
          <View style={styles.priceGroup}>
            {isOutOfStock ? (
              <ThemedText style={styles.oosTag}>Out of stock</ThemedText>
            ) : (
              <>
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
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.qtyButton, (isUpdating || isOutOfStock) && styles.qtyButtonDisabled]}
            onPress={onQuantityPress}
            disabled={isUpdating || isOutOfStock}
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
