import React from 'react';
import { View } from 'react-native';

import { styles } from '../styles/product.styles';

import { ThemedText } from '@/components/themed-text';

interface ProductDescriptionCardProps {
  description?: string | null;
}

export function ProductDescriptionCard({ description }: ProductDescriptionCardProps) {
  if (!description) return null;

  return (
    <>
      <View style={styles.sectionBand} />
      <View style={styles.detailsContainer}>
        <View style={styles.descriptionSection}>
          <ThemedText style={styles.sectionTitle}>Product Description</ThemedText>
          <ThemedText style={styles.descriptionText}>{description}</ThemedText>
        </View>
      </View>
    </>
  );
}
