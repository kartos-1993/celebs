import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { showToast } from '@/components/toast/toast';
import { Palette } from '@/constants/theme';
import { useCart } from '@/features/cart/context/cart-context';
import { useCartSheet } from '@/features/cart/context/cart-sheet-context';
import { CATEGORY_QUERY_KEYS } from '@/features/categories/api';
import { BANNER_QUERY_KEYS, CAMPAIGN_QUERY_KEYS, COMBO_QUERY_KEYS } from '@/features/home/api';
import { ComboBundleModal } from '@/features/home/components/combo-bundle-modal';
import { ComboBundleData } from '@/features/home/components/combo-bundle-showcase';
import { styles } from '@/features/home/styles/home.styles';
import type { CampaignData, ComboSelectedVariants } from '@/features/home/types';
import { buildComboCartInput } from '@/features/home/utils/combo-cart-input';
import { PRODUCT_QUERY_KEYS } from '@/features/products/api';
import { SDUI_QUERY_KEYS } from '@/features/sdui/api';
import { DynamicLayout } from '@/features/sdui/components/dynamic-layout';
import { useSDUILayout } from '@/features/sdui/hooks/use-sdui-layout';
import { useNavigationGuard } from '@/utils/navigation-guard';

export default function HomeScreen() {
  useNavigationGuard();
  const scheme = useColorScheme();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { addComboToCart } = useCart();
  const { openCartSheet } = useCartSheet();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<ComboBundleData | null>(null);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const { data: sduiLayout, refetch: refetchLayout } = useSDUILayout('home');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchLayout(),
        queryClient.invalidateQueries({ queryKey: SDUI_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: BANNER_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: COMBO_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, refetchLayout]);

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

  const handleAddComboToCart = useCallback(
    async (combo: ComboBundleData, selectedVariants: ComboSelectedVariants) => {
      try {
        await addComboToCart(buildComboCartInput(combo, selectedVariants));
        openCartSheet();
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Could not add this combo to cart');
      }
    },
    [addComboToCart, openCartSheet],
  );

  const handlePressCampaign = useCallback(
    (campaign: CampaignData) => {
      router.push({ pathname: '/campaign/[slug]', params: { slug: campaign.slug } });
    },
    [router],
  );

  const sduiHandlers = useMemo(
    () => ({
      onSelectCombo: handleSelectCombo,
      onPressCampaign: handlePressCampaign,
      loadMoreSignal,
    }),
    [handlePressCampaign, handleSelectCombo, loadMoreSignal],
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
        contentContainerStyle={styles.scrollContent}
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
        <DynamicLayout widgets={sduiLayout?.widgets} handlers={sduiHandlers} />
      </ScrollView>

      {/* Combo Bundle Modal */}
      <ComboBundleModal
        visible={isComboModalOpen}
        combo={selectedCombo}
        onClose={() => setIsComboModalOpen(false)}
        onAddToCart={handleAddComboToCart}
      />

      {/* Transparent Floating AppHeader */}
      <AppHeader transparent={true} scrollY={scrollY} showSubHeader={true} initialSubTab="Men" />
    </ThemedView>
  );
}
