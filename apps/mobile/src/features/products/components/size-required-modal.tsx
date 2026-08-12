import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Check, X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';

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
  imageUrl,
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
        <View style={[styles.sheetContainer, { backgroundColor: '#ffffff' }]}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View>
              <ThemedText style={styles.titleText}>Please Select a Size</ThemedText>
              <ThemedText style={styles.subTitleText} numberOfLines={1}>
                {productName}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: '#f4f4f5' }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color="#1c1c1e" />
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
                    isSelected ? { backgroundColor: '#000000' } : { backgroundColor: '#f4f4f5' },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.sizeText,
                      isSelected ? { color: '#ffffff', fontWeight: '800' } : { color: '#1c1c1e' },
                    ]}
                  >
                    {size}
                  </ThemedText>
                  {isSelected && <Check size={14} color="#ffffff" style={{ marginLeft: 4 }} />}
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
    width: SCREEN_WIDTH,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
  },
  subTitleText: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelSection: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    opacity: 0.8,
  },
  sizePillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  sizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 54,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#ff3b30',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
