import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import { ShoppingBag, X } from 'lucide-react-native';

import { validDiscount } from '@celebs/shared-utils';

import { SizePillsGrid } from './size-pills-grid';
import { styles } from './size-required-modal.styles';

import { BottomSheet } from '@/components/bottom-sheet';
import { MobileApparelImage } from '@/components/mobile-apparel-image';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast/toast';
import { Palette } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** A dash for anything that is not a finite number, so NaN never reaches the UI. */
function formatAmount(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';
}

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
  const confirmBtnRef = useRef<View>(null);

  // Re-seed the draft whenever the sheet opens or the incoming size changes.
  // Derived from an effect, never from setState inside the render body.
  useEffect(() => {
    if (visible) setSelectedSize(initialSize);
  }, [visible, initialSize]);

  const handleSelectSize = useCallback((size: string) => setSelectedSize(size), []);

  const handleConfirm = useCallback(() => {
    // A tap on a disabled size must still explain itself — silently doing
    // nothing is indistinguishable from a broken button.
    if (disabledSizes.includes(selectedSize)) {
      showToast('No stock available', { type: 'error' });
      return;
    }
    if (!selectedSize) {
      showToast('Please select a size', { type: 'error' });
      return;
    }
    if (!confirmBtnRef.current) {
      onSelectSizeAndConfirm(selectedSize);
      return;
    }
    confirmBtnRef.current.measureInWindow((x, y, width, height) => {
      const startX =
        typeof x === 'number' && !isNaN(x) && x !== 0 ? x + width / 2 : SCREEN_WIDTH / 2;
      const startY = typeof y === 'number' && !isNaN(y) && y !== 0 ? y + height / 2 : 500;
      onSelectSizeAndConfirm(selectedSize, { x: startX, y: startY });
    });
  }, [disabledSizes, onSelectSizeAndConfirm, selectedSize]);

  // Single shared discount choke point, same as the PDP price card.
  const listPrice = Number.isFinite(price) ? price : undefined;
  const deal = validDiscount(listPrice ?? 0, discountedPrice);
  const currentPrice = deal ?? listPrice ?? 0;
  const hasDiscount = deal !== undefined;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      heightRatio={0.54}
      accessibilityLabel="Select product size"
      header={
        <View style={styles.header}>
          <MobileApparelImage
            src={imageUrl}
            preset="thumbnail"
            containerStyle={styles.thumbnail}
            contentFit="cover"
            alt={`${productName} thumbnail`}
          />
          <View style={styles.headerInfo}>
            <ThemedText style={styles.productName} numberOfLines={1}>
              {productName}
            </ThemedText>
            <View style={styles.priceRow}>
              <ThemedText style={styles.currentPrice}>NPR {formatAmount(currentPrice)}</ThemedText>
              {hasDiscount && (
                <ThemedText style={styles.originalPrice}>NPR {formatAmount(price)}</ThemedText>
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
        onSelectSize={handleSelectSize}
      />
    </BottomSheet>
  );
};
