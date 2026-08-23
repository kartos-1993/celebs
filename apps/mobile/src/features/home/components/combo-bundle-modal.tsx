import React, { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import { ShoppingBag, Sparkles, Tag, X } from 'lucide-react-native';

import { styles } from './combo-bundle-modal.styles';
import { ComboBundleData } from './combo-bundle-showcase';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

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
              <Sparkles size={18} color={Palette.accent} />
              <ThemedText style={styles.headerTitle} numberOfLines={1}>
                {combo.title}
              </ThemedText>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={Palette.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Banner & Savings Callout */}
            <View style={styles.savingsBanner}>
              <Tag size={16} color={Palette.white} />
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
                  <View style={styles.itemInfo}>
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
              <ShoppingBag size={16} color={Palette.white} />
              <ThemedText style={styles.addCartBtnText}>Add Combo to Cart</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
