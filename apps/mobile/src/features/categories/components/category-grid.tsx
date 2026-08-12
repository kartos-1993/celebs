import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { useCategories } from '../hooks/use-categories';
import { styles } from '../styles/categories.styles';

import { ThemedText } from '@/components/themed-text';
import { resolveImageUrl } from '@/constants/config';
import { Colors } from '@/constants/theme';

export function CategoryGrid() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { categories, loading } = useCategories();
  const router = useRouter();

  const handleCategoryPress = (cat: { slug?: string; name?: string; displayName?: string }) => {
    const slug =
      cat.slug || (cat.name ? cat.name.toLowerCase().replace(/\s+/g, '-') : 'denim-jeans');
    router.push({
      pathname: '/category/[slug]',
      params: { slug, title: cat.displayName || cat.name },
    });
  };

  // Chunk categories into groups of 3 per column to guarantee exactly 3 rows on any device
  const columns = React.useMemo(() => {
    const cols: (typeof categories)[] = [];
    for (let i = 0; i < categories.length; i += 3) {
      cols.push(categories.slice(i, i + 3));
    }
    return cols;
  }, [categories]);

  if (loading) {
    return (
      <View style={{ paddingVertical: 20, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.categoriesSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollContent}
      >
        <View style={styles.categoriesRowWrapper}>
          {columns.map((col, colIdx) => (
            <View key={colIdx} style={styles.categoryColumn}>
              {col.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryItem}
                  activeOpacity={0.7}
                  onPress={() => handleCategoryPress(cat)}
                >
                  <View style={styles.categoryImageContainer}>
                    {cat.imageUrl ? (
                      <Image
                        source={{ uri: resolveImageUrl(cat.imageUrl) }}
                        style={styles.categoryImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[styles.categoryImage, { backgroundColor: 'rgba(150,150,150,0.1)' }]}
                      />
                    )}
                  </View>
                  <ThemedText
                    style={styles.categoryName}
                    numberOfLines={2}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.75}
                    maxFontSizeMultiplier={1.15}
                  >
                    {cat.displayName || cat.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
