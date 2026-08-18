import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Check, Ruler, Sparkles, X } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';

interface FitRecommenderWidgetProps {
  availableSizes?: string[];
  selectedSize?: string;
  onSelectSize: (size: string) => void;
  productMeasurements?: Array<{ name: string; value: string; unit?: string }>;
}

export const FitRecommenderWidget = memo(function FitRecommenderWidget({
  availableSizes = ['S', 'M', 'L', 'XL', 'XXL'],
  selectedSize,
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

    // Body mass index baseline
    const bmi = w / ((h / 100) * (h / 100));

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
        <Ruler size={14} color="#4f46e5" />
        <ThemedText style={styles.triggerText}>
          {recommendedResult ? `My Fit: Size ${recommendedResult.size}` : 'Find My Size (AI Fit)'}
        </ThemedText>
        <Sparkles size={12} color="#6366f1" />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.header}>
                  <View style={styles.headerTitleGroup}>
                    <Ruler size={20} color="#4f46e5" />
                    <ThemedText style={styles.title}>Fashion Fit Engine</ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                    <X size={18} color="#6b7280" />
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
                        <ThemedText style={styles.resultSize}>Size {recommendedResult.size}</ThemedText>
                      </View>
                      <View style={styles.confidenceBadge}>
                        <Check size={12} color="#059669" />
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

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  triggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338ca',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  fitPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fitPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fitPillActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#6366f1',
  },
  fitPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  fitPillTextActive: {
    color: '#4338ca',
    fontWeight: '700',
  },
  calcButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  calcButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
  },
  resultSize: {
    fontSize: 18,
    fontWeight: '800',
    color: '#166534',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  applyButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
