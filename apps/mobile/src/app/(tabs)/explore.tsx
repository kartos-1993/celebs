import React from 'react';
import {
  ScrollView,
  StatusBar,
  useColorScheme,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import Constants from 'expo-constants';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { AppHeader } from '@/components/app-header';
import { CategoryGrid } from '@/features/categories/components/category-grid';
import { useCategories } from '@/features/categories/hooks/use-categories';
import { Spacing, Colors } from '@/constants/theme';
import { resolveImageUrl } from '@/constants/config';

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
                  style={[
                    styles.categoryCard,
                    { backgroundColor: '#ffffff' },
                  ]}
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
                      <ChevronRight size={18} color="#8e8e93" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
    paddingTop: Spacing.two,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  categoryList: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    padding: Spacing.three,
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  cardContent: {
    flex: 1,
    marginLeft: Spacing.three,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardPathText: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
});
