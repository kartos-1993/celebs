import React, { useEffect, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Check, Ruler, X } from 'lucide-react-native';

import { styles } from './size-required-modal.styles';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';
import { resolveImageUrl } from '@/features/products/hooks/use-products';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SizeRequiredModalProps {
  visible: boolean;
  availableSizes: string[];
  disabledSizes?: string[];
  productName: string;
  initialSize?: string;
  imageUrl?: string;
  price?: number;
  discountedPrice?: number;
  selectedColorName?: string;
  onClose: () => void;
  onSelectSizeAndConfirm: (selectedSize: string, startCoords?: { x: number; y: number }) => void;
}

export const SizeRequiredModal: React.FC<SizeRequiredModalProps> = ({
  visible,
  availableSizes,
  disabledSizes = [],
  initialSize = '',
  imageUrl,
  price,
  discountedPrice,
  selectedColorName,
  onClose,
  onSelectSizeAndConfirm,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>(initialSize);
  const confirmBtnRef = React.useRef<View>(null);

  useEffect(() => {
    if (visible) {
      setSelectedSize(initialSize);
    }
  }, [visible, initialSize]);

  const handleConfirm = () => {
    if (!selectedSize || disabledSizes.includes(selectedSize)) return;
    if (confirmBtnRef.current) {
      confirmBtnRef.current.measureInWindow((x, y, width, height) => {
        const startX =
          typeof x === 'number' && !isNaN(x) && x !== 0 ? x + width / 2 : SCREEN_WIDTH / 2;
        const startY = typeof y === 'number' && !isNaN(y) && y !== 0 ? y + height / 2 : 500;
        onSelectSizeAndConfirm(selectedSize, { x: startX, y: startY });
      });
    } else {
      onSelectSizeAndConfirm(selectedSize);
    }
  };

  const currentPrice = discountedPrice || price || 0;
  const hasDiscount = Boolean(discountedPrice && price && discountedPrice < price);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      heightRatio={0.52}
      accessibilityLabel="Select product size"
      header={
        <View style={styles.header}>
          <Image
            source={{ uri: resolveImageUrl(imageUrl || '') }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={150}
          />
          <View style={styles.headerInfo}>
            <View style={styles.priceRow}>
              <ThemedText style={styles.currentPrice}>
                Rs. {currentPrice.toLocaleString()}
              </ThemedText>
              {hasDiscount && (
                <ThemedText style={styles.originalPrice}>Rs. {price?.toLocaleString()}</ThemedText>
              )}
            </View>
            <ThemedText style={styles.selectedVariantText} numberOfLines={1}>
              {selectedSize
                ? `Selected: ${selectedColorName ? selectedColorName + ' / ' : ''}${selectedSize}`
                : 'Please select a size'}
            </ThemedText>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={20} color={Palette.gray900} />
          </TouchableOpacity>
        </View>
      }
      footer={
        <View ref={confirmBtnRef} collapsable={false}>
          <TouchableOpacity
            style={[styles.confirmBtn, !selectedSize && styles.confirmBtnDisabled]}
            disabled={!selectedSize}
            activeOpacity={0.85}
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel={
              selectedSize ? `Add to Cart with size ${selectedSize}` : 'Please select a size'
            }
          >
            <ThemedText style={styles.confirmBtnText}>
              {selectedSize ? `Add to Cart — ${selectedSize}` : 'Please Select a Size'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.content}>
        <View style={styles.sectionTitleRow}>
          <ThemedText style={styles.sectionTitle}>Size</ThemedText>
          <View style={styles.sizeGuideLink}>
            <Ruler size={13} color={Palette.gray500} />
            <ThemedText style={styles.sizeGuideText}>Size Guide</ThemedText>
          </View>
        </View>

        <View style={styles.sizePillsGrid}>
          {availableSizes.map((size) => {
            const isSelected = selectedSize === size;
            const isOos = disabledSizes.includes(size);

            return (
              <TouchableOpacity
                key={size}
                activeOpacity={isOos ? 1 : 0.8}
                onPress={() => {
                  if (!isOos) setSelectedSize(size);
                }}
                disabled={isOos}
                style={[
                  styles.sizePill,
                  isSelected && styles.sizePillSelected,
                  !isSelected && !isOos && styles.sizePillUnselected,
                  isOos && styles.sizePillDisabled,
                ]}
              >
                <ThemedText
                  style={[
                    styles.sizeText,
                    isSelected && styles.sizeTextSelected,
                    !isSelected && !isOos && styles.sizeTextUnselected,
                    isOos && styles.sizeTextDisabled,
                  ]}
                >
                  {size}
                </ThemedText>
                {isSelected && (
                  <Check size={14} color={Palette.white} style={{ marginLeft: Spacing.xs }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
};
