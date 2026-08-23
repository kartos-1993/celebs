import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

import { ProductColorVariant, ProductSize } from '../hooks/use-products';

import { styles } from './product-variant-selector.styles';

import { ThemedText } from '@/components/themed-text';
import { resolveImageUrl } from '@/constants/config';

interface ProductVariantSelectorProps {
  colorVariants?: ProductColorVariant[];
  selectedColorIndex: number;
  onSelectColor: (index: number) => void;
  sizes?: ProductSize[];
  selectedSize: string;
  onSelectSize: (sizeName: string) => void;
}

interface ColorSwatchItemProps {
  variant: ProductColorVariant;
  isSelected: boolean;
  onSelect: () => void;
}

const ColorSwatchItem: React.FC<ColorSwatchItemProps> = ({ variant, isSelected, onSelect }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const rawImage =
    variant.images?.[0] ||
    (variant as { image?: string }).image;
  const imageUrl = rawImage ? resolveImageUrl(rawImage) : null;

  return (
    <TouchableOpacity
      style={[styles.colorChip, isSelected && styles.colorChipSelected]}
      onPress={onSelect}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Select color ${variant.name}`}
    >
      {imageUrl && !imageFailed ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.colorThumbnail}
          contentFit="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={[styles.colorDot, { backgroundColor: variant.colorCode || '#000000' }]} />
      )}
      <ThemedText style={[styles.chipText, isSelected && styles.chipTextSelected]}>
        {variant.name}
      </ThemedText>
    </TouchableOpacity>
  );
};

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
            Color:{' '}
            <ThemedText style={styles.valueText}>
              {currentColorVariant?.name || 'Standard'}
            </ThemedText>
          </ThemedText>
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
      {sizes && sizes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sizeHeaderRow}>
            <ThemedText style={styles.sectionLabel}>
              Size:{' '}
              <ThemedText style={styles.valueText}>{selectedSize || 'Select Size'}</ThemedText>
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

          {/* Stock Level Warning Indicator */}
          {selectedSize && selectedSizeQty !== null && (
            <View style={styles.stockNoticeBox}>
              {selectedSizeQty <= 0 ? (
                <ThemedText style={styles.outOfStockText}>
                  ✕ Out of Stock ({selectedSize})
                </ThemedText>
              ) : selectedSizeQty <= 3 ? (
                <ThemedText style={styles.lowStockText}>
                  ⚠️ Only {selectedSizeQty} left in stock for size {selectedSize} - order soon!
                </ThemedText>
              ) : (
                <ThemedText style={styles.inStockText}>
                  ✓ In Stock ({selectedSizeQty} available)
                </ThemedText>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};
