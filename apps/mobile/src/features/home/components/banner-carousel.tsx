import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBanners } from '../hooks/use-home-queries';
import { styles } from '../styles/home.styles';
import type { Banner } from '../types';

import { MobileApparelImage } from '@/components/mobile-apparel-image';
import { showToast } from '@/components/toast/toast';
import { Palette } from '@/constants/theme';

interface BannerSlideProps {
  banner: Banner;
  onPress: (banner: Banner) => void;
}

/**
 * Dedicated, memoized FlatList renderer (mobile AGENTS.md §8): no inline JSX
 * render function, and the press handler is a stable prop instead of a
 * per-render closure.
 */
const BannerSlide = React.memo(function BannerSlide({ banner, onPress }: BannerSlideProps) {
  const handlePress = useCallback(() => onPress(banner), [onPress, banner]);

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={handlePress} style={styles.bannerWrapper}>
      <MobileApparelImage
        src={banner.imageUrl}
        preset="grid-card"
        containerStyle={styles.bannerImage}
        contentFit="cover"
        alt={banner.title ?? 'Promotion'}
      />
    </TouchableOpacity>
  );
});

export function BannerCarousel({ initialBanners }: { initialBanners?: Banner[] } = {}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { banners: queryBanners, loading: queryLoading } = useBanners();
  const banners = initialBanners && initialBanners.length > 0 ? initialBanners : queryBanners;
  const loading = initialBanners && initialBanners.length > 0 ? false : queryLoading;
  const hasBanners = banners.length > 0;

  const stopAutoPlay = useCallback(() => {
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
  }, []);

  const startAutoPlay = useCallback(() => {
    stopAutoPlay();
    if (banners.length <= 1) return;

    autoPlayTimer.current = setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length;
      setActiveIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 4000);
  }, [activeIndex, banners.length, stopAutoPlay]);

  useEffect(() => {
    return () => stopAutoPlay();
  }, [stopAutoPlay]);

  useEffect(() => {
    if (banners.length > 0) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [banners, activeIndex, startAutoPlay, stopAutoPlay]);

  const handleBannerPress = useCallback((banner: Banner) => {
    if (banner.linkType === 'NONE') return;

    if (banner.linkType === 'EXTERNAL' && banner.linkValue) {
      Linking.openURL(banner.linkValue).catch(() => {
        showToast('Could not open link', { type: 'error' });
      });
    } else {
      showToast(`Navigating to ${banner.linkType.toLowerCase()}`, { type: 'info' });
    }
  }, []);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const slideSize = event.nativeEvent.layoutMeasurement.width;
      const index = event.nativeEvent.contentOffset.x / slideSize;
      const roundIndex = Math.round(index);
      if (roundIndex !== activeIndex) {
        setActiveIndex(roundIndex);
      }
    },
    [activeIndex],
  );

  const renderBannerSlide = useCallback(
    ({ item }: { item: Banner }) => <BannerSlide banner={item} onPress={handleBannerPress} />,
    [handleBannerPress],
  );

  return (
    <View style={styles.carouselContainer}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Palette.white} />
        </View>
      ) : !hasBanners ? null : (
        <>
          <FlatList
            ref={flatListRef}
            data={banners}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            keyExtractor={(item) => item.id}
            onScrollBeginDrag={stopAutoPlay}
            onScrollEndDrag={startAutoPlay}
            renderItem={renderBannerSlide}
          />

          <View style={styles.dotContainer}>
            {banners.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, activeIndex === index ? styles.activeDot : null]}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}
