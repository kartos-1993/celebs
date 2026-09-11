import React, { useMemo } from 'react';
import { TextInput, View } from 'react-native';

import { styles } from '../styles/review-modal.styles';
import { evaluateCommentHint } from '../utils/review-quality-hint';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ReviewCommentInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function ReviewCommentInput({ value, onChangeText }: ReviewCommentInputProps) {
  const hint = useMemo(() => evaluateCommentHint(value), [value]);

  return (
    <View style={{ gap: 6 }}>
      <ThemedText style={styles.sectionLabel}>Your Review</ThemedText>
      <TextInput
        style={styles.textInput}
        placeholder="How was the fit, material quality, and delivery? Write your honest thoughts..."
        placeholderTextColor={Palette.gray400}
        multiline
        numberOfLines={4}
        value={value}
        onChangeText={onChangeText}
      />
      {hint.message && (
        <ThemedText
          style={{
            fontSize: 11,
            color: hint.isWarning ? Palette.danger : Palette.gray500,
            marginTop: 2,
          }}
        >
          {hint.message}
        </ThemedText>
      )}
    </View>
  );
}
