import React from 'react';
import { View } from 'react-native';
import { ChevronRight, Star } from 'lucide-react-native';

import { styles } from '../styles/product.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export function ProductReviewsCard() {
  return (
    <View style={styles.detailsContainer}>
      <View style={styles.reviewsSection}>
        <View style={styles.reviewsSummaryRow}>
          <ThemedText style={styles.reviewsScore}>4.8</ThemedText>
          <Star size={15} color={Palette.gold} fill={Palette.gold} />
          <ThemedText style={styles.reviewsCount}>(124 reviews)</ThemedText>
          <View style={styles.reviewsViewMore}>
            <ThemedText style={styles.reviewsViewMoreText}>View more</ThemedText>
            <ChevronRight size={14} color={Palette.gray400} />
          </View>
        </View>
        <ThemedText style={styles.reviewsEmpty}>
          No written reviews yet — be the first to review this product.
        </ThemedText>
      </View>
    </View>
  );
}
