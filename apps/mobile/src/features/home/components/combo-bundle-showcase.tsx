import React from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { ArrowRight, Plane, Sparkles, Tag } from 'lucide-react-native';

import { useCombos } from '../hooks/use-home-queries';
import type { ComboBundleData } from '../types';

import { styles } from './combo-bundle-showcase.styles';

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
        {combos.map((item) => {
          const isTravel = item.tag === 'abroad-travel';
          const isPercentage = item.discountType === 'PERCENTAGE';
          const itemCount = item.itemDetails?.length || item.items?.length || 0;
          const bannerImage = item.bannerImage;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => onSelectCombo?.(item)}
              accessibilityRole="button"
              accessibilityLabel={`View bundle ${item.title}`}
            >
              <View style={styles.imageBox}>
                {/* No demo banner fallback: imageBox already paints a neutral
                    surface, and a fake photo would misrepresent the bundle. */}
                {bannerImage ? (
                  <Image source={{ uri: bannerImage }} style={styles.cardImage} />
                ) : null}

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
