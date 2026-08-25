import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { styles } from '../styles/home.styles';

import { apiClient } from '@/api/client';
import { resolveImageUrl } from '@/constants/config';
import { Palette } from '@/constants/theme';

interface Banner {
  id: string;
  imageUrl: string;
  linkType: 'PRODUCT' | 'CATEGORY' | 'EXTERNAL' | 'NONE';
  linkValue?: string;
  title?: string;
  order: number;
}

export function BannerCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBanners = async (): Promise<Banner[]> => {
    const response = await apiClient.get('/banners', { skipAuth: true });
    const resData = response.data;
    if (resData.success && Array.isArray(resData.data)) {
      return resData.data;
    }
    return [];
  };

  const { data, isLoading: loading } = useQuery({
    queryKey: ['banners'],
    queryFn: fetchBanners,
    // Marketing surface: revalidate on every mount so published banners go
    // live immediately instead of being served from the persisted cache.
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const banners = useMemo(() => data || [], [data]);
  const hasBanners = banners.length > 0;

  const startAutoPlay = () => {
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
  };

  const stopAutoPlay = () => {
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
  };

  useEffect(() => {
    return () => stopAutoPlay();
  }, []);

  useEffect(() => {
    if (banners.length > 0) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [banners, activeIndex]);

  const handleBannerPress = (banner: Banner) => {
    if (banner.linkType === 'NONE') return;

    if (banner.linkType === 'EXTERNAL' && banner.linkValue) {
      Linking.openURL(banner.linkValue).catch(() => {
        Alert.alert('Error', 'Could not open URL');
      });
    } else {
      Alert.alert(
        'Deep Link Triggered',
        `Navigating to ${banner.linkType} ID: ${banner.linkValue}`,
      );
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activeIndex) {
      setActiveIndex(roundIndex);
    }
  };

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
