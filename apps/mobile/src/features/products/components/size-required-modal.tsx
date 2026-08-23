import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, TouchableOpacity, View } from 'react-native';
import { Check, X } from 'lucide-react-native';

import { styles } from './size-required-modal.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SizeRequiredModalProps {
  visible: boolean;
  availableSizes: string[];
  productName: string;
  initialSize?: string;
  imageUrl?: string;
  onClose: () => void;
  onSelectSizeAndConfirm: (selectedSize: string, startCoords?: { x: number; y: number }) => void;
}

export const SizeRequiredModal: React.FC<SizeRequiredModalProps> = ({
  visible,
  availableSizes,
  productName,
  initialSize = '',
  imageUrl: _imageUrl,
  onClose,
  onSelectSizeAndConfirm,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>(initialSize);
  const confirmBtnRef = React.useRef<View>(null);

  // Sync selected size when modal becomes visible
  useEffect(() => {
    if (visible) {
      setSelectedSize(initialSize);
    }
  }, [visible, initialSize]);

  const handleConfirm = () => {
    if (!selectedSize) return;
    if (confirmBtnRef.current) {
      confirmBtnRef.current.measureInWindow((x, y, width, height) => {
        const startX =
          typeof x === 'number' && !isNaN(x) && x !== 0 ? x + width / 2 : SCREEN_WIDTH / 2;
        const startY =
          typeof y === 'number' && !isNaN(y) && y !== 0 ? y + height / 2 : SCREEN_WIDTH * 1.2;
        onSelectSizeAndConfirm(selectedSize, { x: startX, y: startY });
      });
    } else {
      onSelectSizeAndConfirm(selectedSize, { x: SCREEN_WIDTH / 2, y: SCREEN_WIDTH * 1.2 });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { backgroundColor: Palette.white }]}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View>
              <ThemedText style={styles.titleText}>Please Select a Size</ThemedText>
              <ThemedText style={styles.subTitleText} numberOfLines={1}>
                {productName}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: Palette.gray100 }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color={Palette.gray900} />
            </TouchableOpacity>
          </View>

          {/* Size Pills Row */}
          <ThemedText style={styles.labelSection}>Available Sizes</ThemedText>
          <View style={styles.sizePillsGrid}>
            {availableSizes.map((size) => {
              const isSelected = selectedSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  activeOpacity={0.8}
                  onPress={() => setSelectedSize(size)}
                  style={[
                    styles.sizePill,
                    isSelected ? styles.sizePillSelected : styles.sizePillUnselected,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.sizeText,
                      isSelected ? styles.sizeTextSelected : styles.sizeTextUnselected,
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

          {/* Action Button */}
          <View ref={confirmBtnRef} collapsable={false}>
            <TouchableOpacity
              style={[styles.confirmBtn, !selectedSize && { opacity: 0.4 }]}
              disabled={!selectedSize}
              activeOpacity={0.85}
              onPress={handleConfirm}
            >
              <ThemedText style={styles.confirmBtnText}>
                {selectedSize ? `Confirm & Add to Cart (${selectedSize})` : 'Please Select a Size'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
