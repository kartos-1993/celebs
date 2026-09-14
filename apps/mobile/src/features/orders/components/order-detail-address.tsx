import React from 'react';
import { View } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { styles } from '../styles/order-detail.styles';
import type { OrderView } from '../utils/order-status';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';

interface OrderDetailAddressProps {
  address: OrderView['address'];
}

export function OrderDetailAddress({ address }: OrderDetailAddressProps) {
  if (!address) return null;
  const line2 = [address.cityArea, address.district, address.province].filter(Boolean).join(', ');

  return (
    <View style={styles.detailsContainer}>
      <View style={styles.sectionHeaderRow}>
        <MapPin size={16} color={Palette.gray900} />
        <ThemedText style={styles.sectionTitle}>Delivery Address</ThemedText>
      </View>
      <View style={{ gap: Spacing.xxs }}>
        <ThemedText style={styles.addressName}>{address.fullName}</ThemedText>
        <ThemedText style={styles.addressLine}>{address.phone}</ThemedText>
        <ThemedText style={styles.addressLine}>{address.streetAddress}</ThemedText>
        <ThemedText style={styles.addressLine}>{line2}</ThemedText>
        {address.landmark ? (
          <ThemedText style={styles.addressLine}>Landmark: {address.landmark}</ThemedText>
        ) : null}
      </View>
    </View>
  );
}
