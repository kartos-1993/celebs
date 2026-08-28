import React from 'react';
import { View } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { styles } from '../styles/checkout.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { AddressSelector } from '@/features/addresses/components/address-selector';
import type { SavedAddress } from '@/features/addresses/types';

interface CheckoutAddressSectionProps {
  addresses: SavedAddress[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onEdit: (address: SavedAddress) => void;
  onAddNew: () => void;
}

export function CheckoutAddressSection({
  addresses,
  selectedId,
  onSelect,
  onEdit,
  onAddNew,
}: CheckoutAddressSectionProps) {
  return (
    <View style={styles.detailsContainer}>
      <View style={styles.sectionHeaderRow}>
        <MapPin size={16} color={Palette.gray900} />
        <ThemedText style={styles.sectionTitle}>Shipping Address</ThemedText>
      </View>
      <AddressSelector
        addresses={addresses}
        selectedId={selectedId ?? null}
        onSelect={onSelect}
        onEdit={onEdit}
        onAddNew={onAddNew}
      />
    </View>
  );
}
