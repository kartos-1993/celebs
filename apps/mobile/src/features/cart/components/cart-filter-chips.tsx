import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ChevronDown, LayoutGrid, ShoppingCart } from 'lucide-react-native';

import { styles } from './cart-filter-chips.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export type CartListFilter = 'all' | 'selected' | 'brand';

interface CartFilterChipsProps {
  value: CartListFilter;
  brandLabel?: string | null;
  onChange: (filter: CartListFilter) => void;
}

export function CartFilterChips({ value, brandLabel, onChange }: CartFilterChipsProps) {
  return (
    <View style={styles.row}>
      <Chip
        label="All"
        active={value === 'all'}
        onPress={() => onChange('all')}
        accessibilityLabel="Show all cart items"
      />
      <Chip
        label="Selected Items"
        active={value === 'selected'}
        onPress={() => onChange('selected')}
        icon={<ShoppingCart size={14} color={value === 'selected' ? Palette.white : Palette.gray800} />}
        accessibilityLabel="Show selected items only"
      />
      <Chip
        label={value === 'brand' && brandLabel ? brandLabel : 'By Brand'}
        active={value === 'brand'}
        onPress={() => onChange('brand')}
        icon={
          <>
            <LayoutGrid
              size={14}
              color={value === 'brand' ? Palette.white : Palette.gray800}
            />
            <ChevronDown
              size={14}
              color={value === 'brand' ? Palette.white : Palette.gray800}
            />
          </>
        }
        accessibilityLabel="Filter by brand"
      />
    </View>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  accessibilityLabel: string;
}

const Chip: React.FC<ChipProps> = ({ label, active, onPress, icon, accessibilityLabel }) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.chipActive]}
    onPress={onPress}
    activeOpacity={0.8}
    accessible={true}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    accessibilityLabel={accessibilityLabel}
  >
    {icon}
    <ThemedText style={[styles.chipText, active && styles.chipTextActive]}>{label}</ThemedText>
  </TouchableOpacity>
);
