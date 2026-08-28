import React from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { ArrowRight, Plane, Sparkles, Tag } from 'lucide-react-native';

import { useCombos } from '../hooks/use-home-queries';
import type { ComboBundleData } from '../types';
import { DEMO_COMBOS } from '../utils/combo-demo-data';

import { styles } from './combo-bundle-showcase.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export { DEMO_COMBOS };
export type { ComboBundleData, ComboItemData, HydratedProduct } from '../types';

interface ComboBundleShowcaseProps {
  onSelectCombo?: (combo: ComboBundleData) => void;
}

export function ComboBundleShowcase({ onSelectCombo }: ComboBundleShowcaseProps) {
  const { combos: fetchedCombos } = useCombos();
  const combos = fetchedCombos.length > 0 ? fetchedCombos : DEMO_COMBOS;

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
        {combos.map((item) => {
          const isTravel = item.tag === 'abroad-travel';
          const isPercentage = item.discountType === 'PERCENTAGE';
          const itemCount = item.itemDetails?.length || item.items?.length || 3;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => onSelectCombo?.(item)}
            >
              <View style={styles.imageBox}>
                <Image
                  source={{ uri: item.bannerImage || DEMO_COMBOS[0].bannerImage }}
                  style={styles.cardImage}
                />

                <View style={styles.tagBadge}>
                  {isTravel ? (
                    <Plane size={11} color={Palette.white} />
                  ) : (
                    <Tag size={11} color={Palette.white} />
                  )}
                  <ThemedText style={styles.tagBadgeText}>
                    {isTravel ? 'ABROAD TRAVEL PACK' : item.tag?.toUpperCase() || 'COMBO'}
                  </ThemedText>
                </View>

                <View style={styles.savingsPill}>
                  <ThemedText style={styles.savingsPillText}>
                    {isPercentage
                      ? `SAVE ${item.discountValue}%`
                      : `SAVE NPR ${Number(item.discountValue).toLocaleString()}`}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.cardBody}>
                <ThemedText style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </ThemedText>
                {item.subtitle ? (
                  <ThemedText style={styles.cardSubtitle} numberOfLines={2}>
                    {item.subtitle}
                  </ThemedText>
                ) : null}

                <View style={styles.actionRow}>
                  <ThemedText style={styles.itemsCount}>
                    {itemCount} item{itemCount !== 1 ? 's' : ''} included
                  </ThemedText>
                  <View style={styles.viewBtn}>
                    <ThemedText style={styles.viewBtnText}>View Bundle</ThemedText>
                    <ArrowRight size={12} color={Palette.accent} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
