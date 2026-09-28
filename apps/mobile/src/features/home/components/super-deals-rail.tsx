import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { useActiveCampaign } from '../hooks/use-home-queries';
import type { CampaignData, HydratedProduct } from '../types';
import { dealTag, tilePhoto, tilePrice } from '../utils/super-deals.utils';

import { MobileApparelImage } from '@/components/mobile-apparel-image';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/image';
import { useNavigationGuard } from '@/utils/navigation-guard';

type CampaignWithProducts = CampaignData & {
  productDetails?: HydratedProduct[];
};

const MIN_DEAL_TILES = 2;

export function SuperDealsRail() {
  const { activeCampaign } = useActiveCampaign();
  const router = useRouter();
  const navigateSafely = useNavigationGuard();

  const products = React.useMemo(
    () =>
      (
        ((activeCampaign as CampaignWithProducts | null)?.productDetails ?? []).filter(
          (p) => p && p.id,
        ) as HydratedProduct[]
      ).slice(0, 10),
    [activeCampaign],
  );

  const handleTilePress = React.useCallback(
    (productId?: string | number) => {
      if (!productId) return;
      navigateSafely(() => {
        router.navigate({ pathname: '/product/[id]', params: { id: String(productId) } });
      });
    },
    [navigateSafely, router],
  );

  // Prefetch the CLEAN master: the derivative is derived from it by the same
  // pipeline at render time, so warming the master warms the tile.
  const handlePrefetch = React.useCallback((src?: string) => {
    if (src) Image.prefetch(resolveImageUrl(src));
  }, []);

  // Cold-start contract: sparse rails hide instead of rendering hollow shelves.
  if (products.length < MIN_DEAL_TILES) return null;

  return (
    <View style={styles.section}>
      <ThemedText style={styles.title}>
        {(activeCampaign as CampaignWithProducts)?.title || 'Super Deals'}
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {products.map((product) => {
          const src = tilePhoto(product);
          const tag = dealTag(product);
          return (
            <TouchableOpacity
              key={product.id}
              style={styles.tile}
              activeOpacity={0.8}
              onPressIn={() => handlePrefetch(src)}
              onPress={() => handleTilePress(product.id)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Shop deal ${product.name ?? ''}`}
            >
              <View style={styles.photo}>
                <MobileApparelImage
                  src={src}
                  preset="grid-card"
                  containerStyle={styles.image}
                  contentFit="cover"
                  alt={product.name}
                />
              </View>
              <ThemedText style={styles.price}>{tilePrice(product)}</ThemedText>
              {tag ? (
                <View style={styles.tag}>
                  <ThemedText style={styles.tagText}>{tag}</ThemedText>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  rail: {
    paddingHorizontal: 12,
    gap: 10,
  },
  tile: {
    width: 128,
    gap: 4,
  },
  photo: {
    width: 128,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Palette.gray100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
  },
  tag: {
    alignSelf: 'flex-start',
    // UNMAPPED: no Palette token is this exact colour; substituting one would repaint the tag.
    backgroundColor: '#F93A00',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.white,
  },
});
