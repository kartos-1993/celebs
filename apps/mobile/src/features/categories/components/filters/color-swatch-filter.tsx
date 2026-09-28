import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import { QuickFilterItem } from '../../types';

import { styles } from './color-swatch-filter.styles';

import { MobileApparelImage } from '@/components/mobile-apparel-image';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { SWATCH_DOT_FALLBACK_COLOR } from '@/features/products/utils/swatch';

interface ColorSwatchFilterProps {
  items: QuickFilterItem[];
  selectedItem: string | null;
  onSelectItem: (item: QuickFilterItem) => void;
}

/**
 * Quick filters carry no `colorCode` (the shared contract is `name` + `image`),
 * so a filter value with no artwork falls back to a flat dot. These are the
 * quick-filter names that already have a home in the design tokens: every entry
 * below resolves to a Palette token whose VALUE IS BYTE-IDENTICAL to the hex it
 * replaced (`#18181b`→gray900 `#18181B`, `#ffffff`→white, `#dc2626`→danger,
 * `#16a34a`→success, `#eab308`→gold, `#6b7280`→gray500), so no colour on screen
 * moved. Names with no identical token are deliberately absent and fall
 * through to `SWATCH_DOT_FALLBACK_COLOR` rather than borrowing a near-miss.
 */
const COLOR_TOKEN_MAP: Record<string, string> = {
  black: Palette.gray900,
  white: Palette.white,
  red: Palette.danger,
  green: Palette.success,
  yellow: Palette.gold,
  grey: Palette.gray500,
  gray: Palette.gray500,
};

interface ColorSwatchChipProps {
  item: QuickFilterItem;
  isSelected: boolean;
  onSelect: () => void;
}

const ColorSwatchChip: React.FC<ColorSwatchChipProps> = ({ item, isSelected, onSelect }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const lowerName = item.name.toLowerCase();
  const dotColor = COLOR_TOKEN_MAP[lowerName] || SWATCH_DOT_FALLBACK_COLOR;

  return (
    <TouchableOpacity
      style={[styles.colorChip, isSelected && styles.colorChipSelected]}
      activeOpacity={0.8}
      onPress={onSelect}
    >
      {item.image && !imageFailed ? (
        <MobileApparelImage
          src={item.image}
          preset="swatch"
          containerStyle={styles.colorThumbnail}
          contentFit="cover"
          alt={item.name}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
      )}
      <ThemedText style={[styles.chipText, isSelected && styles.chipTextSelected]}>
        {item.name}
      </ThemedText>
    </TouchableOpacity>
  );
};

export const ColorSwatchFilter: React.FC<ColorSwatchFilterProps> = ({
  items,
  selectedItem,
  onSelectItem,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {items.map((item, idx) => {
        const itemKey = item.filterValue || item.name;
        const isSelected = selectedItem === itemKey;

        return (
          <ColorSwatchChip
            key={`${item.name}-${idx}`}
            item={item}
            isSelected={isSelected}
            onSelect={() => onSelectItem(item)}
          />
        );
      })}
    </ScrollView>
  );
};
