import React, { useState, useCallback, useRef } from 'react';
import { ScrollView, StatusBar, useColorScheme, RefreshControl, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { AppHeader } from '@/components/app-header';
import { BannerCarousel } from '@/features/home/components/banner-carousel';
import { CampaignCountdownBanner } from '@/features/home/components/CampaignCountdownBanner';
import { ComboBundleShowcase, ComboBundleData } from '@/features/home/components/ComboBundleShowcase';
import { ComboBundleModal } from '@/features/home/components/ComboBundleModal';
import { CategoryGrid } from '@/features/categories/components/category-grid';
import { ProductGrid, ProductGridRef } from '@/features/products/components/product-grid';
import { styles } from '@/features/home/styles/home.styles';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCombo, setSelectedCombo] = useState<ComboBundleData | null>(null);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const productGridRef = useRef<ProductGridRef>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshKey((prev) => prev + 1);
      setRefreshing(false);
    }, 1000);
  }, []);

  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const currentY = contentOffset.y;
    setScrollY(currentY);

    const isScrollingDown = currentY > lastScrollY.current;
    lastScrollY.current = currentY;

    const isNearEnd = layoutMeasurement.height + currentY >= contentSize.height - 400;
    if (isNearEnd && isScrollingDown) {
      productGridRef.current?.loadMore();
    }
  }, []);

  const handleSelectCombo = useCallback((combo: ComboBundleData) => {
    setSelectedCombo(combo);
    setIsComboModalOpen(true);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <StatusBar 
        barStyle={scrollY > 50 ? (scheme === 'dark' ? 'light-content' : 'dark-content') : 'light-content'} 
        translucent={true} 
        backgroundColor="transparent" 
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={scheme === 'dark' ? '#ffffff' : '#000000'}
            progressViewOffset={90}
          />
        }
      >
        {/* Banner Carousel */}
        <BannerCarousel key={`banner-${refreshKey}`} />

        {/* Content Section */}
        <ThemedView type="backgroundElement" style={styles.contentCard}>
          {/* Festival Campaign Banner with Live Countdown */}
          <CampaignCountdownBanner key={`camp-${refreshKey}`} />

          {/* Curated Travel & Festive Combo Showcase */}
          <ComboBundleShowcase key={`combo-${refreshKey}`} onSelectCombo={handleSelectCombo} />

          {/* Categories Grid */}
          <CategoryGrid key={`cat-${refreshKey}`} />

          {/* Dynamic SHEIN-Style Product Feed */}
          <ProductGrid ref={productGridRef} key={`prod-${refreshKey}`} />
        </ThemedView>
      </ScrollView>

      {/* Combo Bundle Modal */}
      <ComboBundleModal
        visible={isComboModalOpen}
        combo={selectedCombo}
        onClose={() => setIsComboModalOpen(false)}
      />

      {/* Transparent Floating AppHeader */}
      <AppHeader transparent={true} scrollY={scrollY} showSubHeader={true} initialSubTab="Men" />
    </ThemedView>
  );
}

