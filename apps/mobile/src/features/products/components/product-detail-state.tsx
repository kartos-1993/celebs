import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import { styles } from '../styles/product.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ProductDetailStateProps {
  loading: boolean;
  error?: string | null;
  onBack: () => void;
}

export function ProductDetailState({ loading, error, onBack }: ProductDetailStateProps) {
  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={Palette.brand} />
        <ThemedText style={styles.loadingText}>Loading product details...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.centerBox}>
      <ThemedText style={styles.errorText}>{error || 'Product not found.'}</ThemedText>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <ThemedText style={styles.backBtnText}>Go Back</ThemedText>
      </TouchableOpacity>
    </View>
  );
}
