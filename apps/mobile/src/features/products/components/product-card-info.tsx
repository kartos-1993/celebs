import React from 'react';
import { GestureResponderEvent, Pressable, TouchableOpacity, View } from 'react-native';
import { ChevronRight, ShoppingBag } from 'lucide-react-native';

import { styles } from './product-card.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

/** 44pt-min touch target for the compact cart button. */
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

interface ProductCardInfoProps {
  storeName: string;
  productName: string;
  priceColor: string;
  integerPart: number;
  decimalPart: string;
  hasDiscount: boolean;
  discountPercent: number;
  isOutOfStock: boolean;
  onPressIn?: () => void;
  onPress: () => void;
  onAddToCart: (evt?: GestureResponderEvent) => void;
}

export function ProductCardInfo({
  storeName,
  productName,
  priceColor,
  integerPart,
  decimalPart,
  hasDiscount,
  discountPercent,
  isOutOfStock,
  onPressIn,
  onPress,
  onAddToCart,
}: ProductCardInfoProps) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPress={onPress}
      style={styles.detailsContainer}
      accessibilityRole="button"
      accessibilityLabel={`${storeName} ${productName}`}
    >
      <View style={styles.brandBadgeRow}>
        <View style={styles.trendsBadge}>
          <ThemedText style={styles.trendsText}>Trends</ThemedText>
        </View>
        <View style={[styles.storeBadge, { backgroundColor: Palette.accentTint }]}>
          <ThemedText style={[styles.storeText, { color: Palette.accent }]}>{storeName}</ThemedText>
          <ChevronRight size={9} color={Palette.accent} />
        </View>
      </View>

      <ThemedText numberOfLines={1} style={[styles.productName, { color: Palette.gray900 }]}>
        {productName}
      </ThemedText>

      <View style={styles.bottomPriceRow}>
        <View style={styles.priceLeftCol}>
          <View style={styles.mainPriceGroup}>
            <ThemedText style={[styles.currencySymbol, { color: priceColor }]}>Rs.</ThemedText>
            <ThemedText style={[styles.integerPrice, { color: priceColor }]}>
              {integerPart}
            </ThemedText>
            <ThemedText style={[styles.decimalPrice, { color: priceColor }]}>
              {decimalPart}
            </ThemedText>
          </View>

          {hasDiscount && (
            <View style={styles.discountTagPill}>
              <ThemedText style={styles.discountTagText}>-{discountPercent}%</ThemedText>
            </View>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          hitSlop={HIT_SLOP}
          style={[
            styles.cartActionButton,
            { backgroundColor: Palette.gray100, borderColor: Palette.gray200 },
            isOutOfStock && styles.cartActionButtonDisabled,
          ]}
          onPress={onAddToCart}
          accessibilityRole="button"
          accessibilityLabel={
            isOutOfStock ? `${productName} is out of stock` : `Add ${productName} to cart`
          }
          accessibilityState={{ disabled: isOutOfStock }}
        >
          <ShoppingBag size={14} color={Palette.gray900} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}
