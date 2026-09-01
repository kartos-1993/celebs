import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Check, Ruler } from 'lucide-react-native';

import { styles } from './size-required-modal.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';

interface SizePillsGridProps {
  availableSizes: string[];
  disabledSizes?: string[];
  selectedSize: string;
  onSelectSize: (size: string) => void;
}

export function SizePillsGrid({
  availableSizes,
  disabledSizes = [],
  selectedSize,
  onSelectSize,
}: SizePillsGridProps) {
  return (
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
                if (!isOos) onSelectSize(size);
              }}
              disabled={isOos}
              style={[
                styles.sizePill,
                isSelected && styles.sizePillSelected,
                !isSelected && !isOos && styles.sizePillUnselected,
                isOos && styles.sizePillDisabled,
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Size ${size}${isOos ? ' out of stock' : ''}`}
              accessibilityState={{ selected: isSelected, disabled: isOos }}
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
  );
}
