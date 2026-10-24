import React from 'react';
import { TouchableOpacity, View } from 'react-native';

import { styles } from './dynamic-filter-drawer.styles';
import {
  FALLBACK_COLOR_OPTIONS,
  FALLBACK_FIT_OPTIONS,
  FALLBACK_PRICE_RANGES,
  FALLBACK_SIZE_OPTIONS,
} from './filter-constants';

import { ThemedText } from '@/components/themed-text';

export interface DynamicFallbackFilterSectionsProps {
  selectedColors: string[];
  onToggleColor: (colorName: string) => void;
  selectedSizes: string[];
  onToggleSize: (size: string) => void;
  selectedFits: string[];
  onToggleFit: (fit: string) => void;
  selectedPriceRange: { min: number; max: number } | null;
  onSelectPriceRange: (range: { min: number; max: number } | null) => void;
}

export const DynamicFallbackFilterSections: React.FC<DynamicFallbackFilterSectionsProps> = ({
  selectedColors,
  onToggleColor,
  selectedSizes,
  onToggleSize,
  selectedFits,
  onToggleFit,
  selectedPriceRange,
  onSelectPriceRange,
}) => (
  <>
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Colors</ThemedText>
      <View style={styles.chipRow}>
        {FALLBACK_COLOR_OPTIONS.map((c) => {
          const active = selectedColors.includes(c.name);
          return (
            <TouchableOpacity
              key={c.name}
              style={[styles.colorChip, active && styles.colorChipSelected]}
              onPress={() => onToggleColor(c.name)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: c.code === 'gradient' ? '#9333ea' : c.code },
                ]}
              />
              <ThemedText style={[styles.chipText, active && styles.chipTextSelected]}>
                {c.name}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>

    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Sizes</ThemedText>
      <View style={styles.chipRow}>
        {FALLBACK_SIZE_OPTIONS.map((size) => {
          const active = selectedSizes.includes(size);
          return (
            <TouchableOpacity
              key={size}
              style={[styles.sizeChip, active && styles.sizeChipSelected]}
              onPress={() => onToggleSize(size)}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.chipText, active && styles.chipTextSelected]}>
                {size}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>

    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Fit</ThemedText>
      <View style={styles.chipRow}>
        {FALLBACK_FIT_OPTIONS.map((fit) => {
          const active = selectedFits.includes(fit);
          return (
            <TouchableOpacity
              key={fit}
              style={[styles.chip, active && styles.chipSelected]}
              onPress={() => onToggleFit(fit)}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.chipText, active && styles.chipTextSelected]}>
                {fit}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>

    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Price Range</ThemedText>
      <View style={styles.chipRow}>
        {FALLBACK_PRICE_RANGES.map((range) => {
          const active =
            selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max;
          return (
            <TouchableOpacity
              key={range.label}
              style={[styles.chip, active && styles.chipSelected]}
              onPress={() => onSelectPriceRange(active ? null : { min: range.min, max: range.max })}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.chipText, active && styles.chipTextSelected]}>
                {range.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  </>
);
