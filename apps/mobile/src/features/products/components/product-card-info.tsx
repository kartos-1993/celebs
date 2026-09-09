import React from 'react';
import { GestureResponderEvent, Pressable, TouchableOpacity, View } from 'react-native';
import { ChevronRight, ShoppingBag } from 'lucide-react-native';

import { styles } from './product-card.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ProductCardInfoProps {
  storeName: string;
  productName: string;
  priceColor: string;
  integerPart: number;
  decimalPart: string;
  hasDiscount: boolean;
  discountPercent: number;
  isOutOfStock: boolean;
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
  onPress,
  onAddToCart,
}: ProductCardInfoProps) {
  return (
    <Pressable onPress={onPress} style={styles.detailsContainer}>
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
          style={[
            styles.cartActionButton,
            { backgroundColor: Palette.gray100, borderColor: Palette.gray200 },
            isOutOfStock && styles.cartActionButtonDisabled,
          ]}
          onPress={onAddToCart}
          accessibilityLabel={isOutOfStock ? 'Out of stock' : 'Add to cart'}
          accessibilityState={{ disabled: isOutOfStock }}
        >
          <ShoppingBag size={14} color={Palette.gray900} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}
