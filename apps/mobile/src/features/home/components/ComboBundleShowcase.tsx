import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Sparkles, Plane, Tag, ArrowRight, Check } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { apiClient } from '@/api/client';

export interface ComboItemData {
  id: string;
  bundleId: string;
  productId: string;
  defaultQuantity: number;
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
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop',
    items: [{ id: '1', bundleId: 'c1', productId: 'p1', defaultQuantity: 1 }],
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
    bannerImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop',
    items: [{ id: '2', bundleId: 'c2', productId: 'p2', defaultQuantity: 1 }],
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
    bannerImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop',
    items: [{ id: '3', bundleId: 'c3', productId: 'p3', defaultQuantity: 1 }],
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
          { skipAuth: true }
        );
        if (isMounted && response.data?.data && response.data.data.length > 0) {
          setCombos(response.data.data);
        }
      } catch (err) {
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
        <View className="flex-row items-center gap-2">
          <View style={styles.iconCircle}>
            <Sparkles size={16} color="#7c3aed" />
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
                    <Plane size={11} color="#ffffff" />
                  ) : (
                    <Tag size={11} color="#ffffff" />
                  )}
                  <ThemedText style={styles.tagBadgeText}>
                    {isTravel ? 'ABROAD TRAVEL PACK' : (item.tag?.toUpperCase() || 'COMBO')}
                  </ThemedText>
                </View>

                {/* Savings Pill */}
                <View style={styles.savingsPill}>
                  <ThemedText style={styles.savingsPillText}>
                    {isPercentage
                      ? `SAVE ${item.discountValue}%`
                      : `SAVE NPR ${item.discountValue.toLocaleString()}`}
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
                    {item.items?.length || 3} items included
                  </ThemedText>
                  <View style={styles.viewBtn}>
                    <ThemedText style={styles.viewBtnText}>View Bundle</ThemedText>
                    <ArrowRight size={12} color="#7c3aed" />
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

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#18181b',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 1,
  },
  scrollPadding: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 260,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  imageBox: {
    width: '100%',
    height: 130,
    position: 'relative',
    backgroundColor: '#f4f4f5',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  tagBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(24, 24, 27, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  savingsPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#18181b',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
    height: 30,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f5',
  },
  itemsCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#71717a',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7c3aed',
  },
});
