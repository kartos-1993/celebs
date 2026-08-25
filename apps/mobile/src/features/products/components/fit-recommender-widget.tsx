import React, { memo, useCallback, useState } from 'react';
import { Modal, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Check, Ruler, Sparkles, X } from 'lucide-react-native';

import { styles } from './fit-recommender-widget.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface FitRecommenderWidgetProps {
  availableSizes?: string[];
  selectedSize?: string;
  onSelectSize: (size: string) => void;
  productMeasurements?: { name: string; value: string; unit?: string }[];
}

export const FitRecommenderWidget = memo(function FitRecommenderWidget({
  availableSizes = ['S', 'M', 'L', 'XL', 'XXL'],
  selectedSize: _selectedSize,
  onSelectSize,
}: FitRecommenderWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [heightCm, setHeightCm] = useState('170');
  const [weightKg, setWeightKg] = useState('65');
  const [fitPreference, setFitPreference] = useState<'slim' | 'regular' | 'loose'>('regular');
  const [recommendedResult, setRecommendedResult] = useState<{
    size: string;
    confidence: number;
  } | null>(null);

  // Nepali & South Asian standard anthropometric fit calculator
  const calculateSize = useCallback(() => {
    const h = parseFloat(heightCm) || 170;
    const w = parseFloat(weightKg) || 65;

    let baseSize = 'M';
    let confidence = 95;

    if (h < 162) {
      if (w < 55) baseSize = 'S';
      else if (w < 65) baseSize = 'M';
      else baseSize = 'L';
    } else if (h < 174) {
      if (w < 58) baseSize = 'S';
      else if (w < 70) baseSize = 'M';
      else if (w < 82) baseSize = 'L';
      else baseSize = 'XL';
    } else if (h < 183) {
      if (w < 68) baseSize = 'M';
      else if (w < 80) baseSize = 'L';
      else if (w < 92) baseSize = 'XL';
      else baseSize = 'XXL';
    } else {
      if (w < 75) baseSize = 'L';
      else if (w < 88) baseSize = 'XL';
      else baseSize = 'XXL';
    }

    // Shift size based on preference
    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
    let idx = sizes.indexOf(baseSize);

    if (fitPreference === 'slim' && idx > 0) {
      idx -= 1;
      confidence = 92;
    } else if (fitPreference === 'loose' && idx < sizes.length - 1) {
      idx += 1;
      confidence = 94;
    }

    const calculated = sizes[idx] || baseSize;

    // Ensure calculated size is in availableSizes
    const finalSize = availableSizes.includes(calculated)
      ? calculated
      : availableSizes[0] || calculated;

    setRecommendedResult({ size: finalSize, confidence });
  }, [heightCm, weightKg, fitPreference, availableSizes]);

  const handleApplySize = useCallback(() => {
    if (recommendedResult) {
      onSelectSize(recommendedResult.size);
      setIsOpen(false);
    }
  }, [recommendedResult, onSelectSize]);

  return (
    <>
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Ruler size={14} color={Palette.accent} />
        <ThemedText style={styles.triggerText}>
          {recommendedResult ? `My Fit: Size ${recommendedResult.size}` : 'Find My Size (AI Fit)'}
        </ThemedText>
        <Sparkles size={12} color={Palette.accent} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.header}>
                  <View style={styles.headerTitleGroup}>
                    <Ruler size={20} color={Palette.accent} />
                    <ThemedText style={styles.title}>Fashion Fit Engine</ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                    <X size={18} color={Palette.gray500} />
                  </TouchableOpacity>
                </View>

                <ThemedText style={styles.subtitle}>
                  Calibrated for South Asian &amp; Nepali apparel sizing standards.
                </ThemedText>

                {/* Input Fields */}
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

                {/* Fit Preference */}
                <ThemedText style={styles.inputLabel}>Fit Preference</ThemedText>
                <View style={styles.fitPillsRow}>
                  {(['slim', 'regular', 'loose'] as const).map((pref) => (
                    <TouchableOpacity
                      key={pref}
                      style={[styles.fitPill, fitPreference === pref && styles.fitPillActive]}
                      onPress={() => setFitPreference(pref)}
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

                {/* Calculate Button */}
                <TouchableOpacity style={styles.calcButton} onPress={calculateSize}>
                  <ThemedText style={styles.calcButtonText}>Calculate Best Fit</ThemedText>
                </TouchableOpacity>

                {/* Recommendation Card */}
                {recommendedResult && (
                  <View style={styles.resultCard}>
                    <View style={styles.resultTop}>
                      <View>
                        <ThemedText style={styles.resultLabel}>Recommended Fit</ThemedText>
                        <ThemedText style={styles.resultSize}>
                          Size {recommendedResult.size}
                        </ThemedText>
                      </View>
                      <View style={styles.confidenceBadge}>
                        <Check size={12} color={Palette.success} />
                        <ThemedText style={styles.confidenceText}>
                          {recommendedResult.confidence}% Match
                        </ThemedText>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.applyButton} onPress={handleApplySize}>
                      <ThemedText style={styles.applyButtonText}>
                        Apply Size {recommendedResult.size}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
});
