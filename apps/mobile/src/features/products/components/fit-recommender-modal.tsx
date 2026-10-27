import React, { memo, useCallback, useState } from 'react';
import { Modal, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Check, Ruler, X } from 'lucide-react-native';

import {
  calculateFitRecommendation,
  type FitCalculationResult,
  type FitPreference,
} from '../utils/fit-calculator';

import { styles } from './fit-recommender-widget.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

export interface FitRecommenderModalProps {
  visible: boolean;
  onClose: () => void;
  availableSizes?: string[];
  onApplySize: (size: string) => void;
}

export const FitRecommenderModal = memo(function FitRecommenderModal({
  visible,
  onClose,
  availableSizes,
  onApplySize,
}: FitRecommenderModalProps) {
  const [heightCm, setHeightCm] = useState('170');
  const [weightKg, setWeightKg] = useState('65');
  const [fitPreference, setFitPreference] = useState<FitPreference>('regular');
  const [result, setResult] = useState<FitCalculationResult | null>(null);

  const handleCalculate = useCallback(() => {
    const res = calculateFitRecommendation({
      heightCm,
      weightKg,
      fitPreference,
      availableSizes,
    });
    setResult(res);
  }, [heightCm, weightKg, fitPreference, availableSizes]);

  const handleApply = useCallback(() => {
    if (result) {
      onApplySize(result.size);
      onClose();
    }
  }, [result, onApplySize, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <View style={styles.header}>
                <View style={styles.headerTitleGroup}>
                  <Ruler size={20} color={Palette.accent} />
                  <ThemedText style={styles.title}>Fashion Fit Engine</ThemedText>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel="Close fit calculator"
                >
                  <X size={18} color={Palette.gray500} />
                </TouchableOpacity>
              </View>

              <ThemedText style={styles.subtitle}>
                Calibrated for South Asian &amp; Nepali apparel sizing standards.
              </ThemedText>

              <View style={styles.inputsRow}>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Height (cm)</ThemedText>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={heightCm}
                    onChangeText={setHeightCm}
                    placeholder="170"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Weight (kg)</ThemedText>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={weightKg}
                    onChangeText={setWeightKg}
                    placeholder="65"
                  />
                </View>
              </View>

              <ThemedText style={styles.inputLabel}>Fit Preference</ThemedText>
              <View style={styles.fitPillsRow}>
                {(['slim', 'regular', 'loose'] as const).map((pref) => (
                  <TouchableOpacity
                    key={pref}
                    style={[styles.fitPill, fitPreference === pref && styles.fitPillActive]}
                    onPress={() => setFitPreference(pref)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: fitPreference === pref }}
                  >
                    <ThemedText
                      style={[
                        styles.fitPillText,
                        fitPreference === pref && styles.fitPillTextActive,
                      ]}
                    >
                      {pref.charAt(0).toUpperCase() + pref.slice(1)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.calcButton}
                onPress={handleCalculate}
                accessibilityRole="button"
              >
                <ThemedText style={styles.calcButtonText}>Calculate Best Fit</ThemedText>
              </TouchableOpacity>

              {result && (
                <View style={styles.resultCard}>
                  <View style={styles.resultTop}>
                    <View>
                      <ThemedText style={styles.resultLabel}>Recommended Fit</ThemedText>
                      <ThemedText style={styles.resultSize}>Size {result.size}</ThemedText>
                    </View>
                    <View style={styles.confidenceBadge}>
                      <Check size={12} color={Palette.success} />
                      <ThemedText style={styles.confidenceText}>
                        {result.confidence}% Match
                      </ThemedText>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={handleApply}
                    accessibilityRole="button"
                  >
                    <ThemedText style={styles.applyButtonText}>Apply Size {result.size}</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});
