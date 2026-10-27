import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
} from 'react-native';

import { useBanners } from '../hooks/use-home-queries';
import { styles } from '../styles/home.styles';
import type { Banner } from '../types';

import { BannerSlide } from './banner-slide';

import { showToast } from '@/components/toast/toast';
import { Palette } from '@/constants/theme';

export function BannerCarousel({ initialBanners }: { initialBanners?: Banner[] } = {}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setActiveIndex((prev) => {
        const nextIndex = (prev + 1) % banners.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);
  }, [banners.length, stopAutoPlay]);

  useEffect(() => {
    return () => stopAutoPlay();
  }, [stopAutoPlay]);

  useEffect(() => {
    if (banners.length > 1) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [banners.length, startAutoPlay, stopAutoPlay]);

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

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    if (slideSize > 0) {
      const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
      setActiveIndex(index);
    }
  }, []);

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
