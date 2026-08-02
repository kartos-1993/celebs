import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { QuickFilterItem } from '../../types';

interface ChipListFilterProps {
  items: QuickFilterItem[];
  selectedItem: string | null;
  onSelectItem: (item: QuickFilterItem) => void;
}

export const ChipListFilter: React.FC<ChipListFilterProps> = ({
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

        return (
          <TouchableOpacity
            key={`${item.name}-${idx}`}
            style={[styles.chip, isSelected && styles.chipSelected]}
            activeOpacity={0.8}
            onPress={() => onSelectItem(item)}
          >
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
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#208AEF',
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
