import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { apiClient } from '@/api/client';
import { resolveImageUrl } from '@/constants/config';
import { styles } from '../styles/home.styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Banner {
  _id: string;
  imageUrl: string;
  linkType: 'PRODUCT' | 'CATEGORY' | 'EXTERNAL' | 'NONE';
  linkValue?: string;
  title?: string;
  order: number;
}

const MOCK_BANNERS: Banner[] = [
  {
    _id: 'mock1',
    imageUrl: 'https://img.ltwebstatic.com/v4/j/ccc/2026/07/15/36/178408260513f918788ef714d8289a721c85311b29_thumbnail_912x.avif',
    linkType: 'EXTERNAL',
    linkValue: 'https://shein.com',
    title: 'Summer Collection',
    order: 1
  },
  {
    _id: 'mock2',
    imageUrl: 'https://img.ltwebstatic.com/v4/j/ccc/2026/07/16/09/1784183215a8bf204c5653289029a73f2cf89ca0a1_thumbnail_912x.avif',
    linkType: 'NONE',
    title: 'New Trends',
    order: 2
  },
  {
    _id: 'mock3',
    imageUrl: 'https://img.ltwebstatic.com/v4/j/ccc/2026/07/16/96/1784186176ae704306a1eda661d8361a93b90d1a3b_thumbnail_912x.avif',
    linkType: 'NONE',
    title: 'Street Style',
    order: 3
  }
];

import { useQuery } from '@tanstack/react-query';

export function BannerCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBanners = async (): Promise<Banner[]> => {
    try {
      const response = await apiClient.get('/banners', { skipAuth: true });
      const resData = response.data;
      if (resData.success && Array.isArray(resData.data) && resData.data.length > 0) {
        return resData.data;
      }
    } catch {
      // Fall back to mock banners if server call fails
    }
    return MOCK_BANNERS;
  };

  const { data, isLoading: loading } = useQuery({
    queryKey: ['banners'],
    queryFn: fetchBanners,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const banners = useMemo(() => data || [], [data]);

  useEffect(() => {
    return () => stopAutoPlay();
  }, []);

  useEffect(() => {
    if (banners.length > 0) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [banners, activeIndex]);

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

  const handleBannerPress = (banner: Banner) => {
    if (banner.linkType === 'NONE') return;

    if (banner.linkType === 'EXTERNAL' && banner.linkValue) {
      Linking.openURL(banner.linkValue).catch(() => {
        Alert.alert('Error', 'Could not open URL');
      });
    } else {
      Alert.alert(
        'Deep Link Triggered',
        `Navigating to ${banner.linkType} ID: ${banner.linkValue}`
      );
    }
  };

  const onScroll = (event: any) => {
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
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={banners}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            keyExtractor={(item) => item._id}
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
                style={[
                  styles.dot,
                  activeIndex === index ? styles.activeDot : null,
                ]}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}
