import React from 'react';
import { View } from 'react-native';
import { ChevronRight, RotateCcw, ShieldAlert, ShieldCheck, Truck } from 'lucide-react-native';

import { styles } from '../styles/product.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export interface ProductServicesCardProps {
  isNonReturnable?: boolean;
  warrantyType?: string | null;
  warrantyPeriod?: string | null;
  warrantyPolicy?: string | null;
}

export function ProductServicesCard({
  isNonReturnable = false,
  warrantyType,
  warrantyPeriod,
}: ProductServicesCardProps) {
  const hasWarranty =
    Boolean(warrantyType) && warrantyType !== 'NO_WARRANTY' && warrantyType !== 'NONE';

  const warrantyLabel = hasWarranty
    ? `${warrantyPeriod ? `${warrantyPeriod} · ` : ''}${
        warrantyType === 'BRAND_WARRANTY' ? 'Brand Warranty' : 'Seller Warranty'
      }`
    : 'Safe Payments · Privacy Protection';

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
          {isNonReturnable ? (
            <ShieldAlert size={18} color={Palette.gray800} />
          ) : (
            <RotateCcw size={18} color={Palette.gray800} />
          )}
          <ThemedText style={styles.serviceText}>
            {isNonReturnable
              ? 'Non-Returnable Item · Final Sale'
              : 'Returns Accepted · 7-day policy'}
          </ThemedText>
          <ChevronRight size={15} color={Palette.gray400} />
        </View>

        <View style={styles.serviceRow}>
          <ShieldCheck size={18} color={Palette.gray800} />
          <ThemedText style={styles.serviceText}>{warrantyLabel}</ThemedText>
          <ChevronRight size={15} color={Palette.gray400} />
        </View>
      </View>
    </View>
  );
}
