import React from 'react';
import { View } from 'react-native';

import { splitForDisplay } from '@celebs/shared-utils';

import { styles } from './cart-price.styles';

import { ThemedText } from '@/components/themed-text';

interface CartPriceProps {
  value: number;
  color: string;
  size?: 'md' | 'lg';
}

export function CartPrice({ value, color, size = 'md' }: CartPriceProps) {
  // Split by string rather than toFixed: the cart total is summed in whole paisa
  // upstream and this must not reintroduce a rounding error on its way to the
  // screen, where it would contradict the server-computed figure at checkout.
  const { sign, whole, fraction } = splitForDisplay(value);

  return (
    <View style={styles.row}>
      <ThemedText style={[styles.currency, { color }]}>Rs.</ThemedText>
      <ThemedText style={[size === 'lg' ? styles.integerLg : styles.integerMd, { color }]}>
        {sign}
        {whole}
      </ThemedText>
      <ThemedText style={[styles.cents, { color }]}>.{fraction}</ThemedText>
    </View>
  );
}
