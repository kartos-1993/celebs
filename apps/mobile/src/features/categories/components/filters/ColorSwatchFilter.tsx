import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { QuickFilterItem } from '../../types';

interface ColorSwatchFilterProps {
  items: QuickFilterItem[];
  selectedItem: string | null;
  onSelectItem: (item: QuickFilterItem) => void;
}

const COLOR_HEX_MAP: Record<string, string> = {
  blue: '#2563eb',
  black: '#18181b',
  white: '#ffffff',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#eab308',
  grey: '#6b7280',
  gray: '#6b7280',
  beige: '#d4b996',
  multicolor: 'gradient',
};

export const ColorSwatchFilter: React.FC<ColorSwatchFilterProps> = ({
  items,
  selectedItem,
  onSelectItem,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {items.map((item, idx) => {
        const itemKey = item.filterValue || item.name;
        const isSelected = selectedItem === itemKey;
        const lowerName = item.name.toLowerCase();
        const hexColor = COLOR_HEX_MAP[lowerName] || '#94a3b8';

        return (
          <TouchableOpacity
            key={`${item.name}-${idx}`}
            style={[styles.colorChip, isSelected && styles.colorChipSelected]}
            activeOpacity={0.8}
            onPress={() => onSelectItem(item)}
          >
            <View
              style={[
                styles.colorDot,
                { backgroundColor: hexColor === 'gradient' ? '#9333ea' : hexColor },
              ]}
            />
            <ThemedText style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {item.name}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  colorChipSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#208AEF',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
  chipTextSelected: {
    color: '#208AEF',
    fontWeight: '700',
  },
});
