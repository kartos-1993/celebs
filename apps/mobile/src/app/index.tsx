import React, { useState, useCallback, useRef } from 'react';
import { ScrollView, StatusBar, useColorScheme, RefreshControl } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { AppHeader } from '@/components/app-header';
import { BannerCarousel } from '@/features/home/components/banner-carousel';
import { CategoryGrid } from '@/features/categories/components/category-grid';
import { ProductGrid, ProductGridRef } from '@/features/products/components/product-grid';
import { styles } from '@/features/home/styles/home.styles';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const productGridRef = useRef<ProductGridRef>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh by incrementing key to force re-fetch in child components
    setTimeout(() => {
      setRefreshKey((prev) => prev + 1);
      setRefreshing(false);
    }, 1000);
  }, []);

  const lastScrollY = useRef(0);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const currentY = contentOffset.y;
    const isScrollingDown = currentY > lastScrollY.current;
    lastScrollY.current = currentY;

    const isNearEnd = layoutMeasurement.height + currentY >= contentSize.height - 400;
    if (isNearEnd && isScrollingDown) {
      productGridRef.current?.loadMore();
    }
  }, []);

  return (
    <ThemedView style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        translucent={true} 
        backgroundColor="transparent" 
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={scheme === 'dark' ? '#ffffff' : '#000000'}
            progressViewOffset={90} // push spinner below transparent top header
          />
        }
      >
        {/* Banner Section */}
        <BannerCarousel key={`banner-${refreshKey}`} />

        {/* Content Section */}
        <ThemedView type="backgroundElement" style={styles.contentCard}>
          {/* Categories Grid */}
          <CategoryGrid key={`cat-${refreshKey}`} />

          {/* Dynamic SHEIN-Style Product Feed */}
          <ProductGrid ref={productGridRef} key={`prod-${refreshKey}`} />
        </ThemedView>
      </ScrollView>

      {/* Transparent Floating AppHeader */}
      <AppHeader transparent={true} showSubHeader={true} initialSubTab="Men" />
    </ThemedView>
  );
}
