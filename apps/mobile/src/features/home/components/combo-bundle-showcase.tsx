import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { useCombos } from '../hooks/use-home-queries';
import type { ComboBundleData } from '../types';

import { styles } from './combo-bundle-showcase.styles';
import { ComboProductCard } from './combo-product-card';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export type { ComboBundleData, ComboItemData, HydratedProduct } from '../types';

interface ComboBundleShowcaseProps {
  onSelectCombo?: (combo: ComboBundleData) => void;
  initialCombos?: ComboBundleData[];
}

export function ComboBundleShowcase({ onSelectCombo, initialCombos }: ComboBundleShowcaseProps) {
  const { combos: fetchedCombos, loading, refetch } = useCombos();
  const availableCombos = initialCombos && initialCombos.length > 0 ? initialCombos : fetchedCombos;
  const combos = availableCombos;

  // A failed fetch and a genuinely empty catalog both land here: no data. That
  // state used to be masked by three demo bundles with Unsplash photography,
  // which made a backend outage look like a healthy homepage. `useCombos` does
  // not surface the error, so this covers both and offers a real retry.
  if (!loading && combos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <View style={styles.iconCircle}>
              <Sparkles size={16} color={Palette.accent} />
            </View>
            <View>
              <ThemedText style={styles.sectionTitle}>Curated Combo Bundles</ThemedText>
              <ThemedText style={styles.sectionSubtitle}>
                Bundles are unavailable right now
              </ThemedText>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => refetch()}
          accessibilityRole="button"
          accessibilityLabel="Retry loading combo bundles"
        >
          <ThemedText style={styles.cardTitle}>No bundles to show</ThemedText>
          <ThemedText style={styles.cardSubtitle}>Tap to try again</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          <View style={styles.iconCircle}>
            <Sparkles size={16} color={Palette.accent} />
          </View>
          <View>
            <ThemedText style={styles.sectionTitle}>Curated Combo Bundles</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Travel packs & festive bundles with instant savings
            </ThemedText>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollPadding}
      >
        {combos.map((item) => (
          <ComboProductCard key={item.id} combo={item} onSelectCombo={onSelectCombo} />
        ))}
      </ScrollView>
    </View>
  );
}
