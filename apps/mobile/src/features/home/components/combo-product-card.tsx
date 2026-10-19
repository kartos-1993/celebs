import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import type { ComboBundleData } from '../types';
import { getComboDisplayItems } from '../utils/combo-bundle-helpers';

import { styles } from './combo-product-card.styles';

import { MobileApparelImage } from '@/components/mobile-apparel-image';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { getProductCardWidth } from '@/features/products/utils/card-layout';
import { hasRenderableImage } from '@/utils/image';

interface ComboProductCardProps {
  combo: ComboBundleData;
  onSelectCombo?: (combo: ComboBundleData) => void;
}

function savingsLabel(combo: ComboBundleData): string {
  return combo.discountType === 'PERCENTAGE'
    ? `SAVE ${combo.discountValue}%`
    : `SAVE NPR ${Number(combo.discountValue).toLocaleString()}`;
}

/**
 * Product-grid-sized combo card.
 *
 * The collage is built from the bundle's own hydrated product photos; nothing
 * is substituted when the API sends none (the neutral tile is intentional). The
 * whole card opens the customize modal, including the CTA surface.
 */
export const ComboProductCard = React.memo(function ComboProductCard({
  combo,
  onSelectCombo,
}: ComboProductCardProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = getProductCardWidth(windowWidth);

  const displayItems = useMemo(() => getComboDisplayItems(combo), [combo]);
  const collageImages = useMemo(
    () =>
      displayItems
        .map((item) => item.image)
        .filter((image): image is string => hasRenderableImage(image))
        .slice(0, 2),
    [displayItems],
  );

  const handlePress = useCallback(() => onSelectCombo?.(combo), [combo, onSelectCombo]);

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      activeOpacity={0.9}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Customize ${combo.title}`}
    >
      <View style={styles.collage}>
        {collageImages.length > 0 ? (
          collageImages.map((image, index) => (
            <MobileApparelImage
              key={`${image}-${index}`}
              src={image}
              preset="grid-card"
              containerStyle={styles.collageImage}
              alt={combo.title}
            />
          ))
        ) : (
          <View style={styles.collagePlaceholder}>
            <Sparkles size={20} color={Palette.gray400} />
          </View>
        )}

        <View style={styles.savingsPill}>
          <ThemedText style={styles.savingsText}>{savingsLabel(combo)}</ThemedText>
        </View>
      </View>

      <View style={styles.body}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {combo.title}
        </ThemedText>
        <ThemedText style={styles.meta}>
          {displayItems.length} item{displayItems.length !== 1 ? 's' : ''} included
        </ThemedText>

        <View style={styles.addButton}>
          <ThemedText style={styles.addButtonText}>Customize & Add</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
});
