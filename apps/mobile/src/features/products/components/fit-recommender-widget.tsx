import React, { memo, useCallback, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ruler, Sparkles } from 'lucide-react-native';

import { FitRecommenderModal } from './fit-recommender-modal';
import { styles } from './fit-recommender-widget.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

export interface FitRecommenderWidgetProps {
  availableSizes?: string[];
  selectedSize?: string;
  onSelectSize: (size: string) => void;
  productMeasurements?: { name: string; value: string; unit?: string }[];
}

export const FitRecommenderWidget = memo(function FitRecommenderWidget({
  availableSizes = ['S', 'M', 'L', 'XL', 'XXL'],
  onSelectSize,
}: FitRecommenderWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [appliedSize, setAppliedSize] = useState<string | null>(null);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleApplySize = useCallback(
    (size: string) => {
      setAppliedSize(size);
      onSelectSize(size);
    },
    [onSelectSize],
  );

  return (
    <>
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={handleOpen}
        activeOpacity={0.7}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={
          appliedSize
            ? `My Fit: size ${appliedSize}. Tap to recalculate`
            : 'Find my size with the AI fit calculator'
        }
      >
        <Ruler size={14} color={Palette.accent} />
        <ThemedText style={styles.triggerText}>
          {appliedSize ? `My Fit: Size ${appliedSize}` : 'Find My Size (AI Fit)'}
        </ThemedText>
        <Sparkles size={12} color={Palette.accent} />
      </TouchableOpacity>

      <FitRecommenderModal
        visible={isOpen}
        onClose={handleClose}
        availableSizes={availableSizes}
        onApplySize={handleApplySize}
      />
    </>
  );
});
