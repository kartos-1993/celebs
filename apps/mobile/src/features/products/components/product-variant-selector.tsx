import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ChevronRight, Ruler, ScanLine } from 'lucide-react-native';

import type { ProductColorVariant, ProductSize, ProductVariantOption } from '../types';
import { resolveProductSizes } from '../utils/stock';

import { ColorSwatchItem } from './color-swatch-item';
import { styles } from './product-variant-selector.styles';
import { SizeBoxItem } from './size-box-item';

import { ThemedText } from '@/components/themed-text';

export interface ProductVariantSelectorProps {
  colorVariants?: ProductColorVariant[];
  selectedColorIndex: number;
  onSelectColor: (index: number) => void;
  sizes?: ProductSize[];
  variantOptions?: ProductVariantOption[];
  selectedSize: string;
  onSelectSize: (sizeName: string) => void;
}

export const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({
  colorVariants,
  selectedColorIndex,
  onSelectColor,
  sizes,
  variantOptions,
  selectedSize,
  onSelectSize,
}) => {
  const currentColorVariant = colorVariants?.[selectedColorIndex];
  const stocks = currentColorVariant?.stocks;

  // Unify sizes across measurements, variantOptions, and inventory stocks
  const effectiveSizes = useMemo(
    () => resolveProductSizes({ sizes, colorVariants, variantOptions }, selectedColorIndex),
    [sizes, colorVariants, variantOptions, selectedColorIndex],
  );

  const getStockQtyForSize = (sizeName: string): number | null => {
    if (!stocks || stocks.length === 0) return null;
    const item = stocks.find((st) => st.size.toLowerCase() === sizeName.toLowerCase());
    return item ? item.quantity : null;
  };

  const selectedSizeQty = selectedSize ? getStockQtyForSize(selectedSize) : null;
  const selectedSizeData = effectiveSizes.find(
    (s) => s.name.toLowerCase() === selectedSize.toLowerCase(),
  );
  const selectedMeasurements = selectedSizeData?.productMeasurements ?? [];

  return (
    <View style={styles.container}>
      {/* Color Variants */}
      {colorVariants && colorVariants.length > 0 && (
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <ThemedText style={styles.sectionLabel}>
              Color:{' '}
              <ThemedText style={styles.valueText}>
                {currentColorVariant?.name || 'Standard'}
              </ThemedText>
            </ThemedText>
            <ChevronRight size={14} color="#9CA3AF" />
          </View>
          <View style={styles.variantRow}>
            {colorVariants.map((c, idx) => (
              <ColorSwatchItem
                key={`${c.name}-${idx}`}
                variant={c}
                isSelected={selectedColorIndex === idx}
                onSelect={() => onSelectColor(idx)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Size Variants */}
      {effectiveSizes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <ThemedText style={styles.sectionLabel}>
              Size: <ThemedText style={styles.valueText}>{selectedSize || 'Default'}</ThemedText>
            </ThemedText>
            <ChevronRight size={14} color="#9CA3AF" />
          </View>

          <View style={styles.variantRow}>
            {effectiveSizes.map((s) => (
              <SizeBoxItem
                key={s.name}
                sizeName={s.name}
                isSelected={selectedSize === s.name}
                quantity={getStockQtyForSize(s.name)}
                onSelect={() => onSelectSize(s.name)}
              />
            ))}
          </View>

          {/* Product Measurements — shown underneath once a size is selected */}
          {selectedSize && selectedMeasurements.length > 0 && (
            <TouchableOpacity style={styles.measurementBox} activeOpacity={0.9}>
              <View style={styles.measurementTextWrap}>
                {selectedMeasurements.map((m) => (
                  <ThemedText key={m.name} style={styles.measurementText}>
                    <ThemedText style={styles.measurementLabel}>{m.name}:</ThemedText> {m.value}{' '}
                    {m.unit}
                  </ThemedText>
                ))}
              </View>
              <ChevronRight size={14} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* Size Guide Links */}
          {selectedSize && (
            <View style={styles.sizeGuideRow}>
              <View style={styles.sizeGuideLink}>
                <Ruler size={14} color="#18181B" />
                <ThemedText style={styles.sizeGuideText}>Size Guide</ThemedText>
              </View>
              <View style={styles.sizeGuideLink}>
                <ScanLine size={14} color="#18181B" />
                <ThemedText style={styles.sizeGuideText}>Check My Size</ThemedText>
              </View>
            </View>
          )}

          {/* Out of stock notice */}
          {selectedSize && selectedSizeQty !== null && selectedSizeQty <= 0 && (
            <View style={styles.stockNoticeBox}>
              <ThemedText style={styles.outOfStockText}>No stock available</ThemedText>
            </View>
          )}
        </View>
      )}
    </View>
  );
};
