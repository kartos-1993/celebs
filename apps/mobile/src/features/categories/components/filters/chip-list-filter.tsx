import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';

import { QuickFilterItem } from '../../types';

import { styles } from './chip-list-filter.styles';

import { ThemedText } from '@/components/themed-text';

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
