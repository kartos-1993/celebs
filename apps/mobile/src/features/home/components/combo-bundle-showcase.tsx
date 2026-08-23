import React, { useEffect, useState } from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { ArrowRight, Plane, Sparkles, Tag } from 'lucide-react-native';

import { styles } from './combo-bundle-showcase.styles';

import { apiClient } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export interface HydratedProduct {
  id?: string;
  name?: string;
  price?: number;
  mainImages?: string[];
  colorVariants?: Array<{
    name: string;
    colorCode?: string;
    images?: string[];
    stocks?: Array<{ size: string; quantity: number }>;
  }>;
}

export interface ComboItemData {
  id: string;
  bundleId?: string;
  productId: string;
  defaultQuantity?: number;
  product?: HydratedProduct;
}

export interface ComboBundleData {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  bannerImage?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  isFirstParty: boolean;
  tag?: string;
  items?: ComboItemData[];
  itemDetails?: ComboItemData[];
  createdAt: string;
}

const DEMO_COMBOS: ComboBundleData[] = [
  {
    id: 'combo_travel_1',
    title: 'Australia Winter Survival Kit',
    slug: 'australia-winter-survival-kit',
    subtitle: 'Must-have thermal layers & puffer jacket for Aussie students',
    discountType: 'FIXED_AMOUNT',
    discountValue: 2500,
    isFirstParty: true,
    tag: 'abroad-travel',
    bannerImage:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop',
    items: [{ id: '1', productId: 'p1', defaultQuantity: 1 }],
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'combo_travel_2',
    title: 'UK Heavy Warmth Student Pack',
    slug: 'uk-heavy-warmth-student-pack',
    subtitle: '3-piece cold weather bundle (Jacket, Boots, Thermal)',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    isFirstParty: true,
    tag: 'abroad-travel',
    bannerImage:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop',
    items: [{ id: '2', productId: 'p2', defaultQuantity: 1 }],
    createdAt: '2026-08-02T00:00:00Z',
  },
  {
    id: 'combo_festive_1',
    title: 'Dashain Festive Outfit Bundle',
    slug: 'dashain-festive-outfit-bundle',
    subtitle: 'Traditional linen shirt + slim fit denim combo set',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    isFirstParty: true,
    tag: 'festive',
    bannerImage:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop',
    items: [{ id: '3', productId: 'p3', defaultQuantity: 1 }],
    createdAt: '2026-08-03T00:00:00Z',
  },
];

interface ComboBundleShowcaseProps {
  onSelectCombo?: (combo: ComboBundleData) => void;
}

export function ComboBundleShowcase({ onSelectCombo }: ComboBundleShowcaseProps) {
  const [combos, setCombos] = useState<ComboBundleData[]>(DEMO_COMBOS);

  useEffect(() => {
    let isMounted = true;

    async function fetchCombos() {
      try {
        const response = await apiClient.get<{ success: boolean; data: ComboBundleData[] }>(
          '/combos',
          { skipAuth: true },
        );
        if (isMounted && response.data?.data && response.data.data.length > 0) {
          setCombos(response.data.data);
        }
      } catch {
        console.log('[ComboBundleShowcase] Using fallback combo list');
      }
    }

    fetchCombos();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Section Title Header */}
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

      {/* Horizontal Swipeable Card Feed */}
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
              {/* Image Header with Tag & Savings Badge */}
              <View style={styles.imageBox}>
                <Image
                  source={{ uri: item.bannerImage || DEMO_COMBOS[0].bannerImage }}
                  style={styles.cardImage}
                />

                {/* Category Badge */}
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

                {/* Savings Pill */}
                <View style={styles.savingsPill}>
                  <ThemedText style={styles.savingsPillText}>
                    {isPercentage
                      ? `SAVE ${item.discountValue}%`
                      : `SAVE NPR ${Number(item.discountValue).toLocaleString()}`}
                  </ThemedText>
                </View>
              </View>

              {/* Card Body */}
              <View style={styles.cardBody}>
                <ThemedText style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </ThemedText>
                {item.subtitle ? (
                  <ThemedText style={styles.cardSubtitle} numberOfLines={2}>
                    {item.subtitle}
                  </ThemedText>
                ) : null}

                {/* Action Row */}
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
