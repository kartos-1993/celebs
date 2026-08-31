import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Check, Pencil, Plus } from 'lucide-react-native';

import type { SavedAddress } from '../types';

import { styles } from './address-selector.styles';

import { ThemedText } from '@/components/themed-text';

interface AddressSelectorProps {
  addresses: SavedAddress[];
  selectedId: string | null;
  onSelect: (addressId: string) => void;
  onEdit: (address: SavedAddress) => void;
  onAddNew: () => void;
}

export function formatAddressLine(address: SavedAddress): string {
  return [address.streetAddress, address.cityArea, address.district].filter(Boolean).join(', ');
}

export function AddressSelector({
  addresses,
  selectedId,
  onSelect,
  onEdit,
  onAddNew,
}: AddressSelectorProps) {
  return (
    <View style={styles.container}>
      {addresses.map((address) => {
        const isSelected = address.id === selectedId;

        return (
          <View
            key={address.id}
            style={[styles.addressCard, isSelected && styles.addressCardSelected]}
          >
            <TouchableOpacity
              style={styles.touchRow}
              onPress={() => onSelect(address.id)}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="radio"
              accessibilityLabel={`${address.label} address for ${address.fullName}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <View style={styles.infoGroup}>
                <View style={styles.chipRow}>
                  <View style={styles.labelChip}>
                    <ThemedText style={styles.labelChipText}>{address.label}</ThemedText>
                  </View>
                  {address.isDefault && (
                    <View style={styles.defaultBadge}>
                      <ThemedText style={styles.defaultBadgeText}>DEFAULT</ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText style={styles.namePhone} numberOfLines={1}>
                  {address.fullName} · {address.phone}
                </ThemedText>
                <ThemedText style={styles.addressLine} numberOfLines={2}>
                  {formatAddressLine(address)}
                </ThemedText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => onEdit(address)}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${address.label} address`}
            >
              <Pencil size={14} color="#4B5563" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity
        style={styles.addRow}
        onPress={onAddNew}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Add new address"
      >
        <Plus size={16} color="#18181B" strokeWidth={2.4} />
        <ThemedText style={styles.addRowText}>Add New Address</ThemedText>
      </TouchableOpacity>
    </View>
  );
}
