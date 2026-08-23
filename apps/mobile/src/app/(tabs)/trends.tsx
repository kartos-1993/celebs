import React from 'react';
import { ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { styles } from '@/features/trends/styles/trends.styles';

export default function TrendsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="subtitle" style={styles.title}>
          Trends
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          Discover the latest fashion trends and inspiration curated for you.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}
