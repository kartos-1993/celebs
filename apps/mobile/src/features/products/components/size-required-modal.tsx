import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { ShoppingBag, X } from 'lucide-react-native';

import { SizePillsGrid } from './size-pills-grid';
import { styles } from './size-required-modal.styles';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
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
  productName,
  initialSize = '',
  imageUrl,
  price,
  discountedPrice,
  selectedColorName,
  onClose,
  onSelectSizeAndConfirm,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>(initialSize);
  const [prevVisible, setPrevVisible] = useState(visible);
  const [prevInitialSize, setPrevInitialSize] = useState(initialSize);
  const confirmBtnRef = useRef<View>(null);

  if (visible !== prevVisible || initialSize !== prevInitialSize) {
    setPrevVisible(visible);
    setPrevInitialSize(initialSize);
    if (visible) {
      setSelectedSize(initialSize);
    }
  }

  const handleConfirm = useCallback(() => {
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
  }, [disabledSizes, onSelectSizeAndConfirm, selectedSize]);

  const currentPrice = discountedPrice || price || 0;
  const hasDiscount = Boolean(discountedPrice && price && discountedPrice < price);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      heightRatio={0.54}
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
            <ThemedText style={styles.productName} numberOfLines={1}>
              {productName}
            </ThemedText>
            <View style={styles.priceRow}>
              <ThemedText style={styles.currentPrice}>
                NPR {currentPrice.toLocaleString()}
              </ThemedText>
              {hasDiscount && (
                <ThemedText style={styles.originalPrice}>NPR {price?.toLocaleString()}</ThemedText>
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close size selector"
          >
            <X size={18} color={Palette.gray700} />
          </TouchableOpacity>
        </View>
      }
      footer={
        <View ref={confirmBtnRef} collapsable={false} style={styles.footerContainer}>
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
            <ShoppingBag size={18} color={Palette.white} />
            <ThemedText style={styles.confirmBtnText}>
              {selectedSize ? `Add to Cart — ${selectedSize}` : 'Select a Size'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      }
    >
      <SizePillsGrid
        availableSizes={availableSizes}
        disabledSizes={disabledSizes}
        selectedSize={selectedSize}
        onSelectSize={setSelectedSize}
      />
    </BottomSheet>
  );
};
