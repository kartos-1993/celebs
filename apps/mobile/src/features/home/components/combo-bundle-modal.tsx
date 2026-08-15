import React, { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ShoppingBag, Sparkles, Tag, X } from 'lucide-react-native';

import { ComboBundleData } from './combo-bundle-showcase';

import { ThemedText } from '@/components/themed-text';

interface ComboBundleModalProps {
  visible: boolean;
  combo: ComboBundleData | null;
  onClose: () => void;
  onAddToCart?: (combo: ComboBundleData, selectedVariants: Record<string, string>) => void;
}

interface RenderableItem {
  id: string;
  name: string;
  originalPrice: number;
  image: string;
  sizes: string[];
  colors: string[];
}

const FALLBACK_ITEMS: RenderableItem[] = [
  {
    id: 'item_thermal_top',
    name: 'Heavy Fleece Thermal Top',
    originalPrice: 2499,
    image:
      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&auto=format&fit=crop',
    sizes: ['M', 'L', 'XL'],
    colors: ['Black', 'Grey'],
  },
  {
    id: 'item_puffer_jacket',
    name: 'Windproof Winter Puffer Coat',
    originalPrice: 5999,
    image: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&auto=format&fit=crop',
    sizes: ['M', 'L', 'XL'],
    colors: ['Black', 'Navy'],
  },
  {
    id: 'item_thermal_bottom',
    name: 'Insulated Base Layer Pant',
    originalPrice: 1999,
    image:
      'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=400&auto=format&fit=crop',
    sizes: ['M', 'L', 'XL'],
    colors: ['Black'],
  },
];

export function ComboBundleModal({ visible, combo, onClose, onAddToCart }: ComboBundleModalProps) {
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});

  const displayItems: RenderableItem[] = React.useMemo(() => {
    if (combo?.itemDetails && combo.itemDetails.length > 0) {
      return combo.itemDetails.map((item, idx) => {
        const prod = item.product;
        const mainImg =
          prod?.mainImages && prod.mainImages.length > 0
            ? prod.mainImages[0]
            : prod?.colorVariants &&
                prod.colorVariants.length > 0 &&
                prod.colorVariants[0]?.images?.length
              ? prod.colorVariants[0].images[0]
              : FALLBACK_ITEMS[idx % FALLBACK_ITEMS.length].image;

        const sizes = prod?.colorVariants
          ? Array.from(
              new Set(
                prod.colorVariants.flatMap(
                  (cv) => cv.stocks?.map((s) => s.size).filter(Boolean) || [],
                ),
              ),
            )
          : [];

        const colors = prod?.colorVariants
          ? prod.colorVariants.map((cv) => cv.name).filter(Boolean)
          : [];

        return {
          id: item.id || `item_${idx}`,
          name: prod?.name || `Product ${idx + 1}`,
          originalPrice: prod?.price || 2499,
          image: mainImg,
          sizes: sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'],
          colors: colors.length > 0 ? colors : ['Default'],
        };
      });
    }
    return FALLBACK_ITEMS;
  }, [combo]);

  useEffect(() => {
    if (displayItems.length > 0) {
      const initialSizes: Record<string, string> = {};
      const initialColors: Record<string, string> = {};
      displayItems.forEach((item) => {
        initialSizes[item.id] = item.sizes[0] || 'M';
        initialColors[item.id] = item.colors[0] || 'Default';
      });
      setSelectedSizes(initialSizes);
      setSelectedColors(initialColors);
    }
  }, [displayItems]);

  if (!combo) return null;

  const totalOriginalPrice = displayItems.reduce((sum, i) => sum + i.originalPrice, 0);

  let finalBundlePrice = totalOriginalPrice;
  let savingsAmount = 0;

  if (combo.discountType === 'PERCENTAGE') {
    savingsAmount = Math.round((totalOriginalPrice * combo.discountValue) / 100);
    finalBundlePrice = totalOriginalPrice - savingsAmount;
  } else {
    savingsAmount = Number(combo.discountValue);
    finalBundlePrice = Math.max(0, totalOriginalPrice - savingsAmount);
  }

  const handleSelectSize = (itemId: string, size: string) => {
    setSelectedSizes((prev) => ({ ...prev, [itemId]: size }));
  };

  const handleSelectColor = (itemId: string, color: string) => {
    setSelectedColors((prev) => ({ ...prev, [itemId]: color }));
  };

  const handleAddToCart = () => {
    onAddToCart?.(combo, selectedSizes);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleBox}>
              <Sparkles size={18} color="#7c3aed" />
              <ThemedText style={styles.headerTitle} numberOfLines={1}>
                {combo.title}
              </ThemedText>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#71717a" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Banner & Savings Callout */}
            <View style={styles.savingsBanner}>
              <Tag size={16} color="#ffffff" />
              <ThemedText style={styles.savingsBannerText}>
                Instant Savings: NPR {savingsAmount.toLocaleString()} ({combo.discountValue}
                {combo.discountType === 'PERCENTAGE' ? '% OFF' : ' Rs OFF'})
              </ThemedText>
            </View>

            <ThemedText style={styles.sectionSubtitle}>
              Select sizes & colors for all items included in this bundle:
            </ThemedText>

            {/* Bundle Items List */}
            {displayItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                    <ThemedText style={styles.itemOriginalPrice}>
                      Single Price: NPR {item.originalPrice.toLocaleString()}
                    </ThemedText>
                  </View>
                </View>

                {/* Size Selector */}
                <View style={styles.selectorGroup}>
                  <ThemedText style={styles.selectorLabel}>Size:</ThemedText>
                  <View style={styles.optionsRow}>
                    {item.sizes.map((s) => {
                      const isSelected = selectedSizes[item.id] === s;
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[styles.chip, isSelected && styles.chipSelected]}
                          onPress={() => handleSelectSize(item.id, s)}
                        >
                          <ThemedText
                            style={[styles.chipText, isSelected && styles.chipTextSelected]}
                          >
                            {s}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Color Selector */}
                {item.colors.length > 1 && (
                  <View style={styles.selectorGroup}>
                    <ThemedText style={styles.selectorLabel}>Color:</ThemedText>
                    <View style={styles.optionsRow}>
                      {item.colors.map((c) => {
                        const isSelected = selectedColors[item.id] === c;
                        return (
                          <TouchableOpacity
                            key={c}
                            style={[styles.chip, isSelected && styles.chipSelected]}
                            onPress={() => handleSelectColor(item.id, c)}
                          >
                            <ThemedText
                              style={[styles.chipText, isSelected && styles.chipTextSelected]}
                            >
                              {c}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Pricing & Add to Cart Footer */}
          <View style={styles.footer}>
            <View>
              <ThemedText style={styles.originalTotalStrike}>
                NPR {totalOriginalPrice.toLocaleString()}
              </ThemedText>
              <ThemedText style={styles.finalTotal}>
                NPR {finalBundlePrice.toLocaleString()}
              </ThemedText>
            </View>

            <TouchableOpacity
              style={styles.addCartBtn}
              onPress={handleAddToCart}
              activeOpacity={0.85}
            >
              <ShoppingBag size={16} color="#ffffff" />
              <ThemedText style={styles.addCartBtnText}>Add Combo to Cart</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#18181b',
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  savingsBanner: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  savingsBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 12,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemOriginalPrice: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  selectorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    width: 42,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  originalTotalStrike: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  finalTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#16a34a',
  },
  addCartBtn: {
    backgroundColor: '#7c3aed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addCartBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
