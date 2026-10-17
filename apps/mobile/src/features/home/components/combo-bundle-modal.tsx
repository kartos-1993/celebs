import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import { ShoppingBag, Sparkles, Tag, X } from 'lucide-react-native';

import { calculateComboPricing, getComboDisplayItems } from '../utils/combo-bundle-helpers';

import { ComboBundleItemCard } from './combo-bundle-item-card';
import { styles } from './combo-bundle-modal.styles';
import { ComboBundleData } from './combo-bundle-showcase';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

/** Per-item selection carried into add-to-cart: both axes, never just the size. */
export type ComboSelectedVariants = Record<string, { size?: string; color?: string }>;

interface ComboBundleModalProps {
  visible: boolean;
  combo: ComboBundleData | null;
  onClose: () => void;
  onAddToCart?: (combo: ComboBundleData, selectedVariants: ComboSelectedVariants) => void;
}

export function ComboBundleModal({ visible, combo, onClose, onAddToCart }: ComboBundleModalProps) {
  const displayItems = useMemo(() => getComboDisplayItems(combo), [combo]);
  const currentComboId = combo?.id ?? null;

  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});

  // Re-seed the draft from an effect, never from setState inside the render
  // body, and only from values the product actually declares.
  useEffect(() => {
    if (!currentComboId) return;
    const sizes: Record<string, string> = {};
    const colors: Record<string, string> = {};
    for (const item of displayItems) {
      if (item.sizes[0]) sizes[item.id] = item.sizes[0];
      if (item.colors[0]) colors[item.id] = item.colors[0];
    }
    setSelectedSizes(sizes);
    setSelectedColors(colors);
  }, [currentComboId, displayItems]);

  const totalOriginalPrice = useMemo(
    () => displayItems.reduce((sum, i) => sum + i.originalPrice, 0),
    [displayItems],
  );
  const { finalPrice, savings } = calculateComboPricing(combo, totalOriginalPrice);

  const handleSelectSize = useCallback((itemId: string, size: string) => {
    setSelectedSizes((prev) => ({ ...prev, [itemId]: size }));
  }, []);

  const handleSelectColor = useCallback((itemId: string, color: string) => {
    setSelectedColors((prev) => ({ ...prev, [itemId]: color }));
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!combo) return;
    const selectedVariants: ComboSelectedVariants = {};
    for (const item of displayItems) {
      selectedVariants[item.id] = {
        ...(selectedSizes[item.id] ? { size: selectedSizes[item.id] } : {}),
        ...(selectedColors[item.id] ? { color: selectedColors[item.id] } : {}),
      };
    }
    onAddToCart?.(combo, selectedVariants);
    onClose();
  }, [combo, displayItems, onAddToCart, onClose, selectedColors, selectedSizes]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  if (!combo) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerTitleBox}>
              <Sparkles size={18} color={Palette.accent} />
              <ThemedText style={styles.headerTitle} numberOfLines={1}>
                {combo.title}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close combo bundle"
            >
              <X size={20} color={Palette.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.savingsBanner}>
              <Tag size={16} color={Palette.white} />
              <ThemedText style={styles.savingsBannerText}>
                Instant Savings: NPR {savings.toLocaleString()} ({combo.discountValue}
                {combo.discountType === 'PERCENTAGE' ? '% OFF' : ' Rs OFF'})
              </ThemedText>
            </View>

            <ThemedText style={styles.sectionSubtitle}>
              Select sizes & colors for all items included in this bundle:
            </ThemedText>

            {displayItems.map((item) => (
              <ComboBundleItemCard
                key={item.id}
                item={item}
                selectedSize={selectedSizes[item.id]}
                selectedColor={selectedColors[item.id]}
                onSelectSize={handleSelectSize}
                onSelectColor={handleSelectColor}
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View>
              <ThemedText style={styles.originalTotalStrike}>
                NPR {totalOriginalPrice.toLocaleString()}
              </ThemedText>
              <ThemedText style={styles.finalTotal}>NPR {finalPrice.toLocaleString()}</ThemedText>
            </View>

            <TouchableOpacity
              style={styles.addCartBtn}
              onPress={handleAddToCart}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Add ${combo.title} to cart`}
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
