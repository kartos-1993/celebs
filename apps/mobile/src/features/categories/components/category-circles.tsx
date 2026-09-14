import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { useCategories } from '../hooks/use-categories';
import type { Category } from '../types';

import { ThemedText } from '@/components/themed-text';
import { resolveImageUrl } from '@/constants/config';
import { Palette } from '@/constants/theme';
import { useNavigationGuard } from '@/utils/navigation-guard';

const CIRCLE_SIZE = 64;
const MIN_CIRCLES = 3;

export function CategoryCircles({ initialCategories }: { initialCategories?: Category[] } = {}) {
  const { categories: queryCategories } = useCategories();
  const router = useRouter();
  const navigateSafely = useNavigationGuard();

  const source =
    initialCategories && initialCategories.length > 0 ? initialCategories : queryCategories;
  const circles = React.useMemo(
    () => source.filter((cat) => cat.level === 2 && cat.imageUrl),
    [source],
  );

  const handlePress = React.useCallback(
    (cat: Category) => {
      const slug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-');
      navigateSafely(() => {
        router.navigate({
          pathname: '/category/[slug]',
          params: { slug, title: cat.displayName || cat.name },
        });
      });
    },
    [navigateSafely, router],
  );

  // Cold-start contract: sparse rails hide instead of rendering hollow shelves.
  if (circles.length < MIN_CIRCLES) return null;

  return (
    <View style={styles.section}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {circles.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.item}
            activeOpacity={0.7}
            onPress={() => handlePress(cat)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Shop ${cat.displayName || cat.name}`}
          >
            <View style={styles.circle}>
              <Image
                source={{ uri: resolveImageUrl(cat.imageUrl!) }}
                style={styles.image}
                contentFit="cover"
                transition={100}
                cachePolicy="memory-disk"
              />
            </View>
            <ThemedText style={styles.label} numberOfLines={2}>
              {cat.displayName || cat.name}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 12,
  },
  rail: {
    paddingHorizontal: 12,
    gap: 14,
    alignItems: 'flex-start',
  },
  item: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: Palette.gray100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
    color: Palette.gray800,
  },
});
