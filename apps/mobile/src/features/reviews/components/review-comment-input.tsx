import React from 'react';
import { TextInput, View } from 'react-native';

import { styles } from '../styles/review-modal.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ReviewCommentInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function ReviewCommentInput({ value, onChangeText }: ReviewCommentInputProps) {
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
    </View>
  );
}
