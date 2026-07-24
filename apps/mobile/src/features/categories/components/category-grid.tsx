import React from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useCategories } from '../hooks/use-categories';
import { styles } from '../styles/categories.styles';
import { Colors } from '@/constants/theme';

// Helper to resolve local IP for media hosted on the developer machine
const resolveImageUrl = (url: string) => {
  if (!url) return '';
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
  return url.replace(/localhost|127\.0\.0\.1/g, localhost);
};

export function CategoryGrid() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { categories, loading } = useCategories();
  const router = useRouter();

  const handleCategoryPress = (cat: any) => {
    const slug = cat.slug || (cat.name ? cat.name.toLowerCase().replace(/\s+/g, '-') : 'denim-jeans');
    router.push({
      pathname: '/category/[slug]',
      params: { slug, title: cat.displayName || cat.name },
    });
  };

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
        <View style={styles.categoriesGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat._id}
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
                  <View style={[styles.categoryImage, { backgroundColor: 'rgba(150,150,150,0.1)' }]} />
                )}
              </View>
              <ThemedText style={styles.categoryName} numberOfLines={2}>
                {cat.displayName || cat.name}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
