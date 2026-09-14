import React from 'react';
import { TouchableOpacity, View } from 'react-native';

import { styles } from '../styles/review-modal.styles';
import type { ReviewFitRating } from '../types';

import { ThemedText } from '@/components/themed-text';

const FIT_OPTIONS: { key: ReviewFitRating; label: string }[] = [
  { key: 'RUNS_SMALL', label: 'Runs Small' },
  { key: 'TRUE_TO_SIZE', label: 'True to Size' },
  { key: 'RUNS_LARGE', label: 'Runs Large' },
];

interface ReviewFitSelectorProps {
  fitRating: ReviewFitRating;
  onSelectFit: (fit: ReviewFitRating) => void;
}

export function ReviewFitSelector({ fitRating, onSelectFit }: ReviewFitSelectorProps) {
  return (
    <View style={styles.fitSection}>
      <ThemedText style={styles.sectionLabel}>How does it fit?</ThemedText>
      <View style={styles.fitOptionsRow}>
        {FIT_OPTIONS.map((opt) => {
          const isSelected = fitRating === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.fitOptionBtn, isSelected && styles.fitOptionBtnActive]}
              onPress={() => onSelectFit(opt.key)}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.fitOptionText, isSelected && styles.fitOptionTextActive]}>
                {opt.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
