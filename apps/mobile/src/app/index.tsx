import React, { useState, useEffect, useRef } from 'react';
import {
  Platform,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { Link2, Search, Bell, ShoppingBag, ChevronRight } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_HEIGHT = SCREEN_WIDTH * (9 / 16); // 16:9 Aspect Ratio

// API URL helper to dynamically target local server IP in Expo
const getApiUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
  return `http://${localhost}:3333/api/v1`;
};

interface Banner {
  _id: string;
  imageUrl: string;
  linkType: 'PRODUCT' | 'CATEGORY' | 'EXTERNAL' | 'NONE';
  linkValue?: string;
  title?: string;
  order: number;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchBanners();
    return () => stopAutoPlay();
  }, []);

  useEffect(() => {
    if (banners.length > 0) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [banners, activeIndex]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const url = `${getApiUrl()}/banners`;
      const response = await fetch(url);
      const resData = await response.json();
      if (resData.success && Array.isArray(resData.data)) {
        // Only active banners (returned by public route)
        setBanners(resData.data);
      }
    } catch (error) {
      console.warn('Error fetching banners:', error);
      // Fallback mocks if server is offline during development
      setBanners([
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
      ]);
    } finally {
      setLoading(false);
    }
  };

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
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner Section (Bleeds into StatusBar / Apple Style) */}
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
                      source={{ uri: item.imageUrl }}
                      style={styles.bannerImage}
                      contentFit="cover"
                      transition={300}
                    />
                    {/* Visual overlay gradient mockup */}
                    <View style={styles.imageOverlay} />
                  </TouchableOpacity>
                )}
              />

              {/* Apple Pagination Dots */}
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

          {/* Premium Apple Style Floating Header Overlay */}
          <View style={[styles.floatingHeader, { top: insets.top || 12 }]}>
            <View style={styles.headerGlassButton}>
              <Search size={18} color="#ffffff" />
            </View>
            <ThemedText style={styles.headerLogo}>CELEBS</ThemedText>
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <View style={styles.headerGlassButton}>
                <Bell size={18} color="#ffffff" />
              </View>
              <View style={styles.headerGlassButton}>
                <ShoppingBag size={18} color="#ffffff" />
              </View>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <ThemedView type="backgroundElement" style={styles.contentCard}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Summer Trends</ThemedText>
            <TouchableOpacity style={styles.seeAllBtn}>
              <ThemedText style={{ color: colors.text, fontSize: 13, marginRight: 2 }}>See all</ThemedText>
              <ChevronRight size={14} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Simulated Home Grid */}
          <View style={styles.trendGrid}>
            <ThemedView type="background" style={styles.gridItem}>
              <Image
                source="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=500"
                style={styles.gridItemImg}
                contentFit="cover"
              />
              <ThemedText style={styles.gridItemTitle}>Floral Dress</ThemedText>
              <ThemedText type="small" style={{ opacity: 0.6 }}>$49.99</ThemedText>
            </ThemedView>

            <ThemedView type="background" style={styles.gridItem}>
              <Image
                source="https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=500"
                style={styles.gridItemImg}
                contentFit="cover"
              />
              <ThemedText style={styles.gridItemTitle}>Summer Hat</ThemedText>
              <ThemedText type="small" style={{ opacity: 0.6 }}>$24.99</ThemedText>
            </ThemedView>
          </View>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  carouselContainer: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
    position: 'relative',
    backgroundColor: '#1c1c1e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerWrapper: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
    position: 'relative',
  },
  bannerImage: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.15)', // light tint to increase overlay text readability
  },
  dotContainer: {
    position: 'absolute',
    bottom: Spacing.four,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 3,
  },
  activeDot: {
    width: 14,
    backgroundColor: '#ffffff',
  },
  floatingHeader: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  headerGlassButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerLogo: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  contentCard: {
    marginTop: -Spacing.two,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.five,
    paddingHorizontal: Spacing.four,
    minHeight: 300,
    zIndex: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  gridItem: {
    flex: 1,
    borderRadius: 12,
    padding: Spacing.three,
  },
  gridItemImg: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: Spacing.two,
  },
  gridItemTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
