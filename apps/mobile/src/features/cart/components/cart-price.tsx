import React from 'react';
import { View } from 'react-native';

import { styles } from './cart-price.styles';

import { ThemedText } from '@/components/themed-text';

interface CartPriceProps {
  value: number;
  color: string;
  size?: 'md' | 'lg';
}

export function CartPrice({ value, color, size = 'md' }: CartPriceProps) {
  const [integerPart, centsPart] = Math.abs(value).toFixed(2).split('.');
  const sign = value < 0 ? '-' : '';

  return (
    <View style={styles.row}>
      <ThemedText style={[styles.currency, { color }]}>Rs.</ThemedText>
      <ThemedText style={[size === 'lg' ? styles.integerLg : styles.integerMd, { color }]}>
        {sign}
        {integerPart}
      </ThemedText>
      <ThemedText style={[styles.cents, { color }]}>.{centsPart}</ThemedText>
    </View>
  );
}
