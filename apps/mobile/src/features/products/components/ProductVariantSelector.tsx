import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ProductColorVariant, ProductSize } from '../hooks/use-products';
import { ThemedText } from '@/components/themed-text';

interface ProductVariantSelectorProps {
  colorVariants?: ProductColorVariant[];
  selectedColorIndex: number;
  onSelectColor: (index: number) => void;
  sizes?: ProductSize[];
  selectedSize: string;
  onSelectSize: (sizeName: string) => void;
}

export const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({
  colorVariants,
  selectedColorIndex,
  onSelectColor,
  sizes,
  selectedSize,
  onSelectSize,
}) => {
  const currentColorVariant = colorVariants?.[selectedColorIndex];
  const stocks = currentColorVariant?.stocks;

  // Helper to get stock quantity for a size under the current color variant
  const getStockQtyForSize = (sizeName: string): number | null => {
    if (!stocks || stocks.length === 0) return null;
    const item = stocks.find((st) => st.size.toLowerCase() === sizeName.toLowerCase());
    return item ? item.quantity : null;
  };

  const selectedSizeQty = selectedSize ? getStockQtyForSize(selectedSize) : null;

  return (
    <View style={styles.container}>
      {/* Color Variants */}
      {colorVariants && colorVariants.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            Color: <ThemedText style={styles.valueText}>{currentColorVariant?.name || 'Standard'}</ThemedText>
          </ThemedText>
          <View style={styles.variantRow}>
            {colorVariants.map((c, idx) => {
              const isSelected = selectedColorIndex === idx;
              return (
                <TouchableOpacity
                  key={`${c.name}-${idx}`}
                  style={[styles.colorChip, isSelected && styles.colorChipSelected]}
                  onPress={() => onSelectColor(idx)}
                  activeOpacity={0.8}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Select color ${c.name}`}
                >
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: c.colorCode || '#000000' },
                    ]}
                  />
                  <ThemedText style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {c.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Size Variants */}
      {sizes && sizes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sizeHeaderRow}>
            <ThemedText style={styles.sectionLabel}>
              Size: <ThemedText style={styles.valueText}>{selectedSize || 'Select Size'}</ThemedText>
            </ThemedText>
            {!selectedSize && (
              <ThemedText style={styles.sizeNoticeText}>Selection required</ThemedText>
            )}
          </View>

          <View style={styles.variantRow}>
            {sizes.map((s) => {
              const isSelected = selectedSize === s.name;
              const qty = getStockQtyForSize(s.name);
              const isOutOfStock = qty !== null && qty <= 0;

              return (
                <TouchableOpacity
                  key={s.name}
                  style={[
                    styles.sizeBox,
                    isSelected && styles.sizeBoxSelected,
                    isOutOfStock && styles.sizeBoxDisabled,
                  ]}
                  onPress={() => !isOutOfStock && onSelectSize(s.name)}
                  disabled={isOutOfStock}
                  activeOpacity={0.8}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Select size ${s.name}${isOutOfStock ? ' (Out of stock)' : ''}`}
                >
                  <ThemedText
                    style={[
                      styles.sizeText,
                      isSelected && styles.sizeTextSelected,
                      isOutOfStock && styles.sizeTextDisabled,
                    ]}
                  >
                    {s.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Stock Warning Banner */}
          {selectedSizeQty !== null && (
            <View style={styles.stockNoticeBox}>
              {selectedSizeQty <= 0 ? (
                <ThemedText style={styles.outOfStockText}>Currently Out of Stock for size {selectedSize}</ThemedText>
              ) : selectedSizeQty <= 5 ? (
                <ThemedText style={styles.lowStockText}>Only {selectedSizeQty} left in stock - order soon!</ThemedText>
              ) : (
                <ThemedText style={styles.inStockText}>In Stock ({selectedSizeQty} available)</ThemedText>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  section: {
    marginBottom: 16,
  },
  sizeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  valueText: {
    fontWeight: '700',
    color: '#111827',
  },
  sizeNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  variantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  colorChipSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#208AEF',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  chipText: {
    fontSize: 13,
    color: '#4b5563',
  },
  chipTextSelected: {
    color: '#208AEF',
    fontWeight: '600',
  },
  sizeBox: {
    minWidth: 44,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sizeBoxSelected: {
    backgroundColor: '#18181b',
    borderColor: '#18181b',
  },
  sizeBoxDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    opacity: 0.4,
  },
  sizeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  sizeTextSelected: {
    color: '#ffffff',
  },
  sizeTextDisabled: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  stockNoticeBox: {
    marginTop: 10,
  },
  outOfStockText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  lowStockText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
  },
  inStockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
});
