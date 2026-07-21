import React from 'react';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { styles } from '../styles/home.styles';

export function SummerTrends() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">Summer Trends</ThemedText>
        <TouchableOpacity style={styles.seeAllBtn}>
          <ThemedText style={{ color: colors.text, fontSize: 13, marginRight: 2 }}>See all</ThemedText>
          <ChevronRight size={14} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.trendGrid}>
        <ThemedView type="background" style={styles.gridItem}>
          <Image
            source="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=500"
            style={styles.gridItemImg}
            contentFit="cover"
          />
          <ThemedText style={styles.gridItemTitle}>Floral Dress</ThemedText>
          <ThemedText type="small" style={{ opacity: 0.6 }}>$49.99</ThemedText>
        </ThemedView>

        <ThemedView type="background" style={styles.gridItem}>
          <Image
            source="https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=500"
            style={styles.gridItemImg}
            contentFit="cover"
          />
          <ThemedText style={styles.gridItemTitle}>Summer Hat</ThemedText>
          <ThemedText type="small" style={{ opacity: 0.6 }}>$24.99</ThemedText>
        </ThemedView>
      </View>
    </>
  );
}
