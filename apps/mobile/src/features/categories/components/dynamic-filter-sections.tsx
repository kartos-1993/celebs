import React from 'react';
import { TouchableOpacity, View } from 'react-native';

import { DrawerFilterConfig } from '../types';

import { DynamicFallbackFilterSections } from './dynamic-fallback-filter-sections';
import { styles } from './dynamic-filter-drawer.styles';

import { ThemedText } from '@/components/themed-text';

export interface DynamicFilterSectionsProps {
  drawerFilters?: DrawerFilterConfig[];
  selectedColors: string[];
  onToggleColor: (colorName: string) => void;
  selectedSizes: string[];
  onToggleSize: (size: string) => void;
  selectedFits: string[];
  onToggleFit: (fit: string) => void;
  selectedPriceRange: { min: number; max: number } | null;
  onSelectPriceRange: (range: { min: number; max: number } | null) => void;
}

export const DynamicFilterSections: React.FC<DynamicFilterSectionsProps> = ({
  drawerFilters,
  selectedColors,
  onToggleColor,
  selectedSizes,
  onToggleSize,
  selectedFits,
  onToggleFit,
  selectedPriceRange,
  onSelectPriceRange,
}) => {
  const hasApiFilters = drawerFilters && drawerFilters.length > 0;

  if (!hasApiFilters) {
    return (
      <DynamicFallbackFilterSections
        selectedColors={selectedColors}
        onToggleColor={onToggleColor}
        selectedSizes={selectedSizes}
        onToggleSize={onToggleSize}
        selectedFits={selectedFits}
        onToggleFit={onToggleFit}
        selectedPriceRange={selectedPriceRange}
        onSelectPriceRange={onSelectPriceRange}
      />
    );
  }

  return (
    <>
      {drawerFilters.map((filter) => (
        <View key={filter.id || filter.name} style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{filter.name}</ThemedText>
          <View style={styles.chipRow}>
            {filter.values.map((val) => {
              const active =
                filter.uiType === 'color_swatch'
                  ? selectedColors.includes(val)
                  : filter.uiType === 'size_box'
                    ? selectedSizes.includes(val)
                    : selectedFits.includes(val);

              const toggleHandler =
                filter.uiType === 'color_swatch'
                  ? () => onToggleColor(val)
                  : filter.uiType === 'size_box'
                    ? () => onToggleSize(val)
                    : () => onToggleFit(val);

              return (
                <TouchableOpacity
                  key={val}
                  style={[
                    filter.uiType === 'size_box' ? styles.sizeChip : styles.chip,
                    active && styles.chipSelected,
                  ]}
                  onPress={toggleHandler}
                  activeOpacity={0.8}
                >
                  <ThemedText style={[styles.chipText, active && styles.chipTextSelected]}>
                    {val}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </>
  );
};
