import React from 'react';
import { Modal, Pressable, ScrollView, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';

import { DrawerFilterConfig } from '../types';

import { styles } from './dynamic-filter-drawer.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export const FALLBACK_COLOR_OPTIONS = [
  { name: 'Blue', code: '#2563eb' },
  { name: 'Light Wash', code: '#93c5fd' },
  { name: 'Dark Wash', code: '#1e3a8a' },
  { name: 'Black', code: '#18181b' },
  { name: 'Grey', code: '#71717a' },
  { name: 'Beige', code: '#d4b996' },
  { name: 'White', code: '#ffffff' },
  { name: 'Multicolor', code: 'gradient' },
];

export const FALLBACK_SIZE_OPTIONS = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '28',
  '30',
  '32',
  '34',
  '36',
  '38',
];
export const FALLBACK_FIT_OPTIONS = [
  'Loose',
  'Oversized',
  'Regular Fit',
  'Slim Fit',
  'Wide Leg',
  'Straight Leg',
];
export const FALLBACK_PRICE_RANGES = [
  { label: 'Under Rs. 2500', min: 0, max: 2500 },
  { label: 'Rs. 2500 - Rs. 5000', min: 2500, max: 5000 },
  { label: 'Rs. 5000 - Rs. 10000', min: 5000, max: 10000 },
  { label: 'Over Rs. 10000', min: 10000, max: 999999 },
];

interface DynamicFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  drawerFilters?: DrawerFilterConfig[];
  selectedColors: string[];
  onToggleColor: (colorName: string) => void;
  selectedSizes: string[];
  onToggleSize: (size: string) => void;
  selectedFits: string[];
  onToggleFit: (fit: string) => void;
  selectedPriceRange: { min: number; max: number } | null;
  onSelectPriceRange: (range: { min: number; max: number } | null) => void;
  onReset: () => void;
  totalFilteredCount: number;
}

export const DynamicFilterDrawer: React.FC<DynamicFilterDrawerProps> = ({
  isOpen,
  onClose,
  drawerFilters,
  selectedColors,
  onToggleColor,
  selectedSizes,
  onToggleSize,
  selectedFits,
  onToggleFit,
  selectedPriceRange,
  onSelectPriceRange,
  onReset,
  totalFilteredCount,
}) => {
  // Determine sections from API config if available, otherwise render default sections
  const hasApiFilters = drawerFilters && drawerFilters.length > 0;

  return (
    <Modal visible={isOpen} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.drawerContainer}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Filter Products</ThemedText>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close filters"
            >
              <X size={20} color={Palette.gray900} />
            </TouchableOpacity>
          </View>

          {/* Filter Body */}
          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {hasApiFilters ? (
              drawerFilters.map((filter) => (
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
              ))
            ) : (
              <>
                {/* Fallback Color Section */}
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

                {/* Fallback Size Section */}
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

                {/* Fallback Fit Section */}
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

                {/* Price Section */}
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Price Range</ThemedText>
                  <View style={styles.chipRow}>
                    {FALLBACK_PRICE_RANGES.map((range) => {
                      const active =
                        selectedPriceRange?.min === range.min &&
                        selectedPriceRange?.max === range.max;
                      return (
                        <TouchableOpacity
                          key={range.label}
                          style={[styles.chip, active && styles.chipSelected]}
                          onPress={() =>
                            onSelectPriceRange(active ? null : { min: range.min, max: range.max })
                          }
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
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.8}>
              <ThemedText style={styles.resetBtnText}>Clear All</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={onClose} activeOpacity={0.85}>
              <ThemedText style={styles.applyBtnText}>Show {totalFilteredCount} Items</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

