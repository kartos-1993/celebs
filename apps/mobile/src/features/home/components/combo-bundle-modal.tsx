import React, { useCallback, useMemo, useState } from 'react';
import { Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import { ShoppingBag, Sparkles, Tag, X } from 'lucide-react-native';

import { calculateComboPricing, getComboDisplayItems } from '../utils/combo-bundle-helpers';

import { ComboBundleItemCard } from './combo-bundle-item-card';
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

export function ComboBundleModal({ visible, combo, onClose, onAddToCart }: ComboBundleModalProps) {
  const displayItems = useMemo(() => getComboDisplayItems(combo), [combo]);

  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [prevComboId, setPrevComboId] = useState<string | null>(null);

  const currentComboId = combo?.id ?? null;
  if (currentComboId !== prevComboId) {
    setPrevComboId(currentComboId);
    const initialSizes: Record<string, string> = {};
    const initialColors: Record<string, string> = {};
    displayItems.forEach((item) => {
      initialSizes[item.id] = item.sizes[0] || 'M';
      initialColors[item.id] = item.colors[0] || 'Default';
    });
    setSelectedSizes(initialSizes);
    setSelectedColors(initialColors);
  }

  const totalOriginalPrice = displayItems.reduce((sum, i) => sum + i.originalPrice, 0);
  const { finalPrice, savings } = calculateComboPricing(combo, totalOriginalPrice);

  const handleSelectSize = useCallback((itemId: string, size: string) => {
    setSelectedSizes((prev) => ({ ...prev, [itemId]: size }));
  }, []);

  const handleSelectColor = useCallback((itemId: string, color: string) => {
    setSelectedColors((prev) => ({ ...prev, [itemId]: color }));
  }, []);

  const handleAddToCart = useCallback(() => {
    if (combo) {
      onAddToCart?.(combo, selectedSizes);
    }
    onClose();
  }, [combo, onAddToCart, onClose, selectedSizes]);

  if (!combo) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
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
