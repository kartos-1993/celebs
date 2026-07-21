import React from 'react';
import { ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { HomeHeader } from '@/features/home/components/home-header';
import { BannerCarousel } from '@/features/home/components/banner-carousel';
import { CategoryGrid } from '@/features/categories/components/category-grid';
import { SummerTrends } from '@/features/home/components/summer-trends';
import { styles } from '@/features/home/styles/home.styles';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner Section with Floating Header Overlay */}
        <BannerCarousel />
        <HomeHeader topOffset={insets.top || 12} />

        {/* Content Section */}
        <ThemedView type="backgroundElement" style={styles.contentCard}>
          {/* Categories Grid */}
          <CategoryGrid />

          {/* Summer Trends Listings */}
          <SummerTrends />
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}
