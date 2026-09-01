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
import { Image } from 'expo-image';

import { useBanners } from '../hooks/use-home-queries';
import { styles } from '../styles/home.styles';
import type { Banner } from '../types';

import { showToast } from '@/components/toast/toast';
import { resolveImageUrl } from '@/constants/config';
import { Palette } from '@/constants/theme';

export function BannerCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { banners, loading } = useBanners();
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
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => handleBannerPress(item)}
                style={styles.bannerWrapper}
              >
                <Image
                  source={{ uri: resolveImageUrl(item.imageUrl) }}
                  style={styles.bannerImage}
                  contentFit="cover"
                  transition={300}
                />
              </TouchableOpacity>
            )}
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
