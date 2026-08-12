import React from 'react';
import { Modal, Pressable,ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';

import { DrawerFilterConfig } from '../types';

import { ThemedText } from '@/components/themed-text';

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
              <X size={20} color="#18181b" />
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#18181b',
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontSize: 13,
    color: '#4b5563',
  },
  chipTextSelected: {
    color: '#208AEF',
    fontWeight: '600',
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sizeChip: {
    width: 44,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sizeChipSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#208AEF',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  applyBtn: {
    flex: 2,
    backgroundColor: '#208AEF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
