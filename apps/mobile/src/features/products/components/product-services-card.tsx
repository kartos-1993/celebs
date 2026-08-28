import React from 'react';
import { View } from 'react-native';
import { ChevronRight, RotateCcw, ShieldCheck, Truck } from 'lucide-react-native';

import { styles } from '../styles/product.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export function ProductServicesCard() {
  return (
    <View style={styles.detailsContainer}>
      <View style={styles.shippingSection}>
        <View style={[styles.serviceRow, styles.serviceRowDivider]}>
          <Truck size={18} color={Palette.gray800} />
          <ThemedText style={styles.serviceText}>
            Free Delivery{' '}
            <ThemedText style={styles.serviceHighlight}>on orders over Rs. 3,000</ThemedText>
          </ThemedText>
          <ChevronRight size={15} color={Palette.gray400} />
        </View>

        <View style={[styles.serviceRow, styles.serviceRowDivider]}>
          <RotateCcw size={18} color={Palette.gray800} />
          <ThemedText style={styles.serviceText}>Returns Accepted · 7-day policy</ThemedText>
          <ChevronRight size={15} color={Palette.gray400} />
        </View>

        <View style={styles.serviceRow}>
          <ShieldCheck size={18} color={Palette.gray800} />
          <ThemedText style={styles.serviceText}>Safe Payments · Privacy Protection</ThemedText>
          <ChevronRight size={15} color={Palette.gray400} />
        </View>
      </View>
    </View>
  );
}
