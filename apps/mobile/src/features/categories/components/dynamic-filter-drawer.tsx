import React from 'react';
import { Modal, Pressable, ScrollView, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';

import { DrawerFilterConfig } from '../types';

import { styles } from './dynamic-filter-drawer.styles';
import { DynamicFilterSections } from './dynamic-filter-sections';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export {
  FALLBACK_COLOR_OPTIONS,
  FALLBACK_FIT_OPTIONS,
  FALLBACK_PRICE_RANGES,
  FALLBACK_SIZE_OPTIONS,
} from './filter-constants';

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
}) => (
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
          <DynamicFilterSections
            drawerFilters={drawerFilters}
            selectedColors={selectedColors}
            onToggleColor={onToggleColor}
            selectedSizes={selectedSizes}
            onToggleSize={onToggleSize}
            selectedFits={selectedFits}
            onToggleFit={onToggleFit}
            selectedPriceRange={selectedPriceRange}
            onSelectPriceRange={onSelectPriceRange}
          />
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
