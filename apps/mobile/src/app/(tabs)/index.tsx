import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StatusBar,
  useColorScheme,
} from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { ComboBundleModal } from '@/features/home/components/combo-bundle-modal';
import { ComboBundleData } from '@/features/home/components/combo-bundle-showcase';
import { styles } from '@/features/home/styles/home.styles';
import { DynamicLayout } from '@/features/sdui/components/dynamic-layout';
import { useSDUILayout } from '@/features/sdui/hooks/use-sdui-layout';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCombo, setSelectedCombo] = useState<ComboBundleData | null>(null);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const { data: sduiLayout, refetch: refetchLayout } = useSDUILayout('home');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetchLayout();
    setTimeout(() => {
      setRefreshKey((prev) => prev + 1);
      setRefreshing(false);
    }, 1000);
  }, [refetchLayout]);

  const [scrollY, setScrollY] = useState(0);
  const [loadMoreSignal, setLoadMoreSignal] = useState(0);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const currentY = contentOffset.y;
    setScrollY(currentY);

    const isScrollingDown = currentY > lastScrollY.current;
    lastScrollY.current = currentY;

    const isNearEnd = layoutMeasurement.height + currentY >= contentSize.height - 400;
    if (isNearEnd && isScrollingDown) {
      setLoadMoreSignal((prev) => prev + 1);
    }
  }, []);

  const handleSelectCombo = useCallback((combo: ComboBundleData) => {
    setSelectedCombo(combo);
    setIsComboModalOpen(true);
  }, []);

  const sduiHandlers = useMemo(
    () => ({
      onSelectCombo: handleSelectCombo,
      loadMoreSignal,
    }),
    [handleSelectCombo, loadMoreSignal]
  );

  return (
    <ThemedView style={styles.container}>
      <StatusBar
        barStyle={
          scrollY > 50 ? (scheme === 'dark' ? 'light-content' : 'dark-content') : 'light-content'
        }
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
            tintColor={scheme === 'dark' ? Palette.white : Palette.black}
            progressViewOffset={90}
          />
        }
      >
        {/* Dynamic Server-Driven Layout */}
        <DynamicLayout
          widgets={sduiLayout?.widgets}
          handlers={sduiHandlers}
          refreshKey={refreshKey}
        />
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
