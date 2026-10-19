import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  StatusBar,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ShoppingCart } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useCart } from '@/features/cart/context/cart-context';
import { useCartSheet } from '@/features/cart/context/cart-sheet-context';
import { useCountdown } from '@/features/home/hooks/use-countdown';
import { useCampaign } from '@/features/home/hooks/use-home-queries';
import { styles } from '@/features/home/styles/campaign.styles';
import type { CampaignData, TimeRemaining } from '@/features/home/types';
import { ProductCard } from '@/features/products/components/product-card';
import { type Product, useProducts } from '@/features/products/hooks/use-products';
import { hasRenderableImage, resolveImageUrl } from '@/utils/image';

interface CampaignHeroProps {
  campaign: CampaignData;
  timeRemaining: TimeRemaining | null;
}

function CampaignHero({ campaign, timeRemaining }: CampaignHeroProps) {
  const content = (
    <View style={styles.heroContent}>
      <ThemedText style={styles.heroEyebrow}>{campaign.campaignType} SALE</ThemedText>
      <ThemedText style={styles.heroTitle}>{campaign.title}</ThemedText>
      {campaign.tagline ? (
        <ThemedText style={styles.heroTagline} numberOfLines={2}>
          {campaign.tagline}
        </ThemedText>
      ) : null}
      {timeRemaining && !timeRemaining.isExpired ? (
        <ThemedText style={styles.heroCountdown}>
          Ends in {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m{' '}
          {timeRemaining.seconds}s
        </ThemedText>
      ) : null}
    </View>
  );

  const themeColor = campaign.themeColor || Palette.danger;

  if (!hasRenderableImage(campaign.bannerImage)) {
    return <View style={[styles.hero, { backgroundColor: themeColor }]}>{content}</View>;
  }

  return (
    <ImageBackground
      source={{ uri: resolveImageUrl(campaign.bannerImage, { preset: 'grid-card' }) }}
      style={styles.hero}
      imageStyle={styles.heroImage}
    >
      <View style={[styles.heroOverlay, { backgroundColor: themeColor }]} />
      {content}
    </ImageBackground>
  );
}

export default function CampaignScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const campaignSlug = (Array.isArray(params.slug) ? params.slug[0] : params.slug) || '';
  const router = useRouter();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();
  const { openCartSheet } = useCartSheet();

  const { campaign, loading: campaignLoading, error: campaignError } = useCampaign(campaignSlug);
  const {
    products,
    loading: productsLoading,
    loadingMore,
    hasMore,
    loadMore,
  } = useProducts({
    campaign: campaignSlug,
    limit: 20,
  });
  const timeRemaining = useCountdown(campaign?.endDate ?? '');

  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => <ProductCard product={item} />,
    [],
  );

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={Palette.gray900} />
        </TouchableOpacity>

        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {campaign?.title ?? 'Campaign'}
        </ThemedText>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={openCartSheet}
          accessibilityRole="button"
          accessibilityLabel="View cart"
        >
          <ShoppingCart size={22} color={Palette.gray900} />
          {itemCount > 0 ? (
            <View style={styles.cartBadge}>
              <ThemedText style={styles.cartBadgeText}>{itemCount}</ThemedText>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {campaignLoading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color={Palette.brand} />
        </View>
      ) : !campaign ? (
        <View style={styles.state}>
          <ThemedText style={styles.stateTitle}>{campaignError ?? 'Campaign not found'}</ThemedText>
        </View>
      ) : (
        <FlashList
          style={styles.list}
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasMore && !loadingMore) loadMore();
          }}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={<CampaignHero campaign={campaign} timeRemaining={timeRemaining} />}
          ListEmptyComponent={
            productsLoading ? (
              <ActivityIndicator size="large" color={Palette.brand} />
            ) : (
              <ThemedText style={styles.emptyText}>No products in this campaign yet.</ThemedText>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={Palette.brand} />
              </View>
            ) : null
          }
        />
      )}
    </ThemedView>
  );
}
