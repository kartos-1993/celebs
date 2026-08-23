import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { resolveImageUrl } from '@/constants/config';
import { Colors, Palette } from '@/constants/theme';
import { CategoryGrid } from '@/features/categories/components/category-grid';
import { useCategories } from '@/features/categories/hooks/use-categories';
import { styles } from '@/features/categories/styles/explore.styles';

export default function CategoryExploreScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const router = useRouter();
  const { categories, loading } = useCategories();

  const handleCategoryClick = (slug: string, title: string) => {
    router.push({
      pathname: '/category/[slug]',
      params: { slug, title },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" translucent={false} />

      {/* Sticky App Header */}
      <AppHeader showSubHeader={true} initialSubTab="Men" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Quick Horizontal Subcategories Bar */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Browse Categories</ThemedText>
        </View>

        <CategoryGrid />

        {/* Dynamic Category List from API */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>All Collections</ThemedText>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.text} />
          </View>
        ) : (
          <View style={styles.categoryList}>
            {categories.map((cat) => {
              const catSlug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-');
              const catTitle = cat.displayName || cat.name;
              const imageUrl = resolveImageUrl(cat.imageUrl);

              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.8}
                  style={[styles.categoryCard, { backgroundColor: Palette.white }]}
                  onPress={() => handleCategoryClick(catSlug, catTitle)}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.cardImage}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                      <ThemedText style={styles.cardTitle}>{catTitle}</ThemedText>
                      <ChevronRight size={18} color={Palette.gray400} />
                    </View>
                    <ThemedText style={styles.cardPathText}>
                      Explore {catTitle} styles & collections
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}
