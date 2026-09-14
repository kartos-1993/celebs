import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { Palette } from '@/constants/theme';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  onSelectRating?: (rating: number) => void;
}

export function StarRating({ rating, maxStars = 5, size = 14, onSelectRating }: StarRatingProps) {
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <View style={styles.row}>
      {stars.map((star) => {
        const isFilled = star <= Math.round(rating);
        const starIcon = (
          <Star
            key={star}
            size={size}
            color={isFilled ? (Palette.gold ?? '#F59E0B') : Palette.gray300}
            fill={isFilled ? (Palette.gold ?? '#F59E0B') : 'transparent'}
          />
        );

        if (!onSelectRating) {
          return starIcon;
        }

        return (
          <TouchableOpacity
            key={star}
            onPress={() => onSelectRating(star)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${star} stars`}
          >
            {starIcon}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
