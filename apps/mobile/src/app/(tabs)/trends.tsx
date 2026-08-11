import React from 'react';
import { ScrollView,StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  title: {
    marginBottom: Spacing.two,
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
});
