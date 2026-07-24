import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  StatusBar,
  useColorScheme,
  ActivityIndicator,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingCart,
  Share2,
  X,
  Truck,
  RotateCcw,
  ShieldCheck,
  MapPin,
  Star,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProduct, resolveImageUrl } from '@/features/products/hooks/use-products';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 1.33; // 3:4 aspect ratio

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const { product, loading, error } = useProduct(id || '');

  // State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const mainFlatListRef = useRef<FlatList>(null);
  const modalFlatListRef = useRef<FlatList>(null);

  // Compute active images based on selected color variant
  const activeColorVariant = product?.colorVariants?.[selectedColorIndex];

  // Derive dynamic sizes from database product.sizes or active color variant stocks
  const availableSizes = useMemo(() => {
    if (!product) return [];
    if (product.sizes && product.sizes.length > 0) {
      return product.sizes.map((s) => s.name);
    }
    if (activeColorVariant?.stocks && activeColorVariant.stocks.length > 0) {
      return activeColorVariant.stocks.map((s) => s.size);
    }
    if (product.colorVariants && product.colorVariants.length > 0) {
      const allStockSizes = new Set<string>();
      product.colorVariants.forEach((v) => {
        v.stocks?.forEach((s) => allStockSizes.add(s.size));
      });
      if (allStockSizes.size > 0) {
        return Array.from(allStockSizes);
      }
    }
    return [];
  }, [product, activeColorVariant]);

  // Set default selected size when availableSizes is computed
  React.useEffect(() => {
    if (availableSizes.length > 0 && (!selectedSize || !availableSizes.includes(selectedSize))) {
      setSelectedSize(availableSizes[0]);
    }
  }, [availableSizes]);

  // Format real measurements from database for the selected size
  const currentMeasurementsText = useMemo(() => {
    if (!product || !product.sizes || product.sizes.length === 0) return '';
    const sizeData = product.sizes.find((s) => s.name === selectedSize);
    if (!sizeData) return '';
    const measurements = sizeData.productMeasurements?.length
      ? sizeData.productMeasurements
      : sizeData.bodyMeasurements;
    if (!measurements || measurements.length === 0) return '';
    return measurements.map((m) => `${m.name}: ${m.value}${m.unit ? ' ' + m.unit : ''}`).join(', ');
  }, [product, selectedSize]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    if (activeColorVariant && activeColorVariant.images && activeColorVariant.images.length > 0) {
      return activeColorVariant.images.map(resolveImageUrl);
    }
    if (product.mainImages && product.mainImages.length > 0) {
      return product.mainImages.map(resolveImageUrl);
    }
    return [];
  }, [product, activeColorVariant]);

  // Price calculations
  const hasDiscount = Boolean(product?.discountedPrice && product.discountedPrice < product.price);
  const currentPrice = hasDiscount ? product!.discountedPrice! : product?.price || 0;
  const discountPercent = hasDiscount
    ? Math.round(((product!.price - product!.discountedPrice!) / product!.price) * 100)
    : 15;
  const priceColor = hasDiscount ? (isDark ? '#FF9F0A' : '#FF5000') : isDark ? '#ffffff' : '#000000';
  const integerPart = Math.floor(currentPrice);
  const decimalPart = (currentPrice % 1).toFixed(2).substring(1);

  // Color selection handler
  const handleSelectColor = (index: number) => {
    setSelectedColorIndex(index);
    setActiveImageIndex(0);
    mainFlatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Open Fullscreen Modal
  const openImageModal = (index: number) => {
    setModalImageIndex(index);
    setIsModalOpen(true);
  };

  const handleMainScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slide !== activeImageIndex && slide >= 0 && slide < galleryImages.length) {
      setActiveImageIndex(slide);
    }
  };

  const handleModalScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slide !== modalImageIndex && slide >= 0 && slide < galleryImages.length) {
      setModalImageIndex(slide);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerBox, { backgroundColor: isDark ? '#121212' : '#ffffff' }]}>
        <ActivityIndicator size="large" color={isDark ? '#ffffff' : '#000000'} />
        <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>Loading Product...</ThemedText>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.centerBox, { backgroundColor: isDark ? '#121212' : '#ffffff' }]}>
        <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>Product Not Found</ThemedText>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <ThemedText style={{ color: '#ffffff', fontWeight: '700' }}>Go Back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedColorName = activeColorVariant?.name || 'Default';

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent={false} />

      {/* FLOATING TOP NAVIGATION BAR */}
      <View
        style={[
          styles.topHeaderBar,
          {
            paddingTop: insets.top + 4,
            backgroundColor: isDark ? 'rgba(18, 18, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderBottomColor: isDark ? '#2c2c2e' : '#f2f2f7',
          },
        ]}
      >
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <ChevronLeft size={22} color={isDark ? '#ffffff' : '#1c1c1e'} strokeWidth={2.2} />
        </TouchableOpacity>

        <ThemedText style={styles.headerTitleText} numberOfLines={1}>
          {product.brand || 'BODI'}
        </ThemedText>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => setIsFavorite(!isFavorite)}>
            <Heart
              size={20}
              color={isFavorite ? '#ff3b30' : isDark ? '#ffffff' : '#1c1c1e'}
              fill={isFavorite ? '#ff3b30' : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => router.push('/cart')}>
            <ShoppingCart size={20} color={isDark ? '#ffffff' : '#1c1c1e'} />
            <View style={styles.cartBadge}>
              <ThemedText style={styles.cartBadgeText}>2</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Share2 size={19} color={isDark ? '#ffffff' : '#1c1c1e'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* MAIN IMAGE CAROUSEL / SWIPER */}
        <View style={styles.swiperContainer}>
          <FlatList
            ref={mainFlatListRef}
            data={galleryImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleMainScroll}
            scrollEventThrottle={16}
            keyExtractor={(_, index) => `main-img-${index}`}
            renderItem={({ item, index }) => (
              <TouchableOpacity activeOpacity={0.95} onPress={() => openImageModal(index)}>
                <Image source={{ uri: item }} style={styles.swiperImage} contentFit="cover" transition={200} />
              </TouchableOpacity>
            )}
          />

          {/* Bottom Right Image Counter Badge (e.g. 1 / 5) */}
          {galleryImages.length > 0 && (
            <View style={styles.imageCounterPill}>
              <ThemedText style={styles.imageCounterText}>
                {activeImageIndex + 1} / {galleryImages.length}
              </ThemedText>
            </View>
          )}
        </View>

        {/* PRODUCT TITLE & PRICE INFO */}
        <View style={[styles.infoSection, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
          {/* Brand & Trends Tag */}
          <View style={styles.brandRow}>
            <View style={styles.trendsBadge}>
              <ThemedText style={styles.trendsText}>Trends</ThemedText>
            </View>
            <TouchableOpacity style={[styles.storeBadge, { backgroundColor: isDark ? '#3b0764' : '#faf5ff' }]}>
              <ThemedText style={[styles.storeText, { color: isDark ? '#d8b4fe' : '#6b21a8' }]}>
                {product.brand || 'BODI'}
              </ThemedText>
              <ChevronRight size={10} color={isDark ? '#d8b4fe' : '#7c3aed'} />
            </TouchableOpacity>
          </View>

          {/* Product Name */}
          <ThemedText style={[styles.productTitle, { color: isDark ? '#ffffff' : '#1c1c1e' }]}>
            {product.name}
          </ThemedText>

          {/* Price & Discount Tag */}
          <View style={styles.priceRow}>
            <View style={styles.mainPriceGroup}>
              <ThemedText style={[styles.currencySymbol, { color: priceColor }]}>Rs.</ThemedText>
              <ThemedText style={[styles.integerPrice, { color: priceColor }]}>{integerPart}</ThemedText>
              <ThemedText style={[styles.decimalPrice, { color: priceColor }]}>{decimalPart}</ThemedText>
            </View>

            {hasDiscount && (
              <View style={styles.discountTagPill}>
                <ThemedText style={styles.discountTagText}>-{discountPercent}%</ThemedText>
              </View>
            )}
          </View>

          {/* Bestseller Row */}
          {product.featured && (
            <View style={styles.bestsellerRow}>
              <ThemedText style={styles.bestsellerText}>
                #1 Bestseller <ThemedText style={styles.bestsellerSub}>in Men Collection</ThemedText>
              </ThemedText>
              <ChevronRight size={12} color="#d97706" />
            </View>
          )}

          {/* Sales & New Arrival Badge */}
          <View style={styles.salesRow}>
            <View style={[styles.newArrivalBadge, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
              <ThemedText style={[styles.newArrivalText, { color: isDark ? '#6ee7b7' : '#047857' }]}>
                NEW ARRIVAL
              </ThemedText>
            </View>
            <ThemedText style={[styles.soldText, { color: isDark ? '#a1a1aa' : '#71717a' }]}>80+ sold</ThemedText>
          </View>
        </View>

        {/* COLOR SELECTION ROW */}
        {product.colorVariants && product.colorVariants.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
            <TouchableOpacity style={styles.sectionHeaderRow} activeOpacity={0.7}>
              <ThemedText style={styles.sectionTitle}>
                Color: <ThemedText style={styles.sectionTitleSub}>{selectedColorName}</ThemedText>
              </ThemedText>
              <ChevronRight size={16} color={isDark ? '#a1a1aa' : '#71717a'} />
            </TouchableOpacity>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>
              {product.colorVariants.map((variant, index) => {
                const isSelected = selectedColorIndex === index;
                const variantImg = variant.images?.[0] ? resolveImageUrl(variant.images[0]) : galleryImages[0];

                return (
                  <TouchableOpacity
                    key={variant.name + index}
                    activeOpacity={0.8}
                    onPress={() => handleSelectColor(index)}
                    style={[
                      styles.colorBox,
                      { borderColor: isDark ? '#3a3a3c' : '#e4e4e7' },
                      isSelected && {
                        borderColor: isDark ? '#ffffff' : '#000000',
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Image source={{ uri: variantImg }} style={styles.colorThumbImage} contentFit="cover" />
                    {variant.colorCode && (
                      <View style={[styles.colorDotBadge, { backgroundColor: variant.colorCode }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* SIZE SELECTION ROW */}
        {availableSizes.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
            <TouchableOpacity style={styles.sectionHeaderRow} activeOpacity={0.7}>
              <ThemedText style={styles.sectionTitle}>
                Size: <ThemedText style={styles.sectionTitleSub}>{selectedSize}</ThemedText>
              </ThemedText>
              <ChevronRight size={16} color={isDark ? '#a1a1aa' : '#71717a'} />
            </TouchableOpacity>

            {/* Size Buttons */}
            <View style={styles.sizeRow}>
              {availableSizes.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    activeOpacity={0.8}
                    onPress={() => setSelectedSize(size)}
                    style={[
                      styles.sizePill,
                      isSelected
                        ? { backgroundColor: isDark ? '#ffffff' : '#000000' }
                        : { backgroundColor: isDark ? '#2c2c2e' : '#f4f4f5' },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.sizeText,
                        isSelected
                          ? { color: isDark ? '#000000' : '#ffffff', fontWeight: '800' }
                          : { color: isDark ? '#ffffff' : '#1c1c1e' },
                      ]}
                    >
                      {size}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Dynamic Measurements Bar */}
            {Boolean(currentMeasurementsText) && (
              <View style={[styles.measurementsBox, { backgroundColor: isDark ? '#2c2c2e' : '#f8f8f8' }]}>
                <ThemedText style={[styles.measurementsText, { color: isDark ? '#d1d5db' : '#4b5563' }]}>
                  {currentMeasurementsText}
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* SHIPPING & GUARANTEE INFO BLOCK */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
          {/* Destination Header */}
          <TouchableOpacity style={styles.shippingHeaderRow} activeOpacity={0.8}>
            <ThemedText style={styles.shippingTitleText}>
              Shipping to <MapPin size={13} color={isDark ? '#ffffff' : '#000000'} /> Algeria
            </ThemedText>
            <ChevronRight size={16} color={isDark ? '#a1a1aa' : '#71717a'} />
          </TouchableOpacity>

          {/* Free Shipping Line */}
          <View style={styles.shippingItemRow}>
            <Truck size={17} color="#059669" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.freeShippingText}>Free Shipping (Orders ≥ $99.00)</ThemedText>
              <ThemedText style={[styles.estDeliveryText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                Est. Delivery: Aug 13 - Aug 23
              </ThemedText>
            </View>
            <ChevronRight size={15} color={isDark ? '#9ca3af' : '#9ca3af'} />
          </View>

          {/* Returns Accepted */}
          <View style={styles.shippingItemRow}>
            <RotateCcw size={16} color={isDark ? '#ffffff' : '#374151'} style={{ marginTop: 1 }} />
            <ThemedText style={[styles.shippingItemLabel, { flex: 1 }]}>Returns Accepted</ThemedText>
            <ChevronRight size={15} color={isDark ? '#9ca3af' : '#9ca3af'} />
          </View>

          {/* Safe Payments */}
          <View style={styles.shippingItemRow}>
            <ShieldCheck size={16} color={isDark ? '#ffffff' : '#374151'} style={{ marginTop: 1 }} />
            <ThemedText style={[styles.shippingItemLabel, { flex: 1 }]}>
              Safe Payments · Privacy Protection
            </ThemedText>
            <ChevronRight size={15} color={isDark ? '#9ca3af' : '#9ca3af'} />
          </View>
        </View>

        {/* RATING & REVIEWS PREVIEW */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText style={styles.sectionTitle}>
              Customer Reviews <Star size={13} color="#f59e0b" fill="#f59e0b" /> 4.85 (250+)
            </ThemedText>
            <ChevronRight size={16} color={isDark ? '#a1a1aa' : '#71717a'} />
          </View>
          <ThemedText style={{ fontSize: 11.5, opacity: 0.6, marginTop: 4 }}>
            Fits true to size. Great denim quality & comfort.
          </ThemedText>
        </View>
      </ScrollView>

      {/* FULL-SCREEN HIGH-RES DARK MODAL VIEWER */}
      <Modal visible={isModalOpen} animationType="fade" transparent={false} onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />

          {/* Close Button Top Right */}
          <TouchableOpacity
            style={[styles.modalCloseBtn, { top: insets.top + 10 }]}
            activeOpacity={0.8}
            onPress={() => setIsModalOpen(false)}
          >
            <X size={22} color="#ffffff" />
          </TouchableOpacity>

          {/* High Res Swiper */}
          <FlatList
            ref={modalFlatListRef}
            data={galleryImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={modalImageIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onScroll={handleModalScroll}
            scrollEventThrottle={16}
            keyExtractor={(_, index) => `modal-img-${index}`}
            renderItem={({ item }) => (
              <View style={styles.modalImageWrapper}>
                <Image source={{ uri: item }} style={styles.modalFullImage} contentFit="contain" />
              </View>
            )}
          />

          {/* Bottom Counter */}
          <View style={[styles.modalCounterPill, { bottom: insets.bottom + 20 }]}>
            <ThemedText style={styles.modalCounterText}>
              {modalImageIndex + 1} / {galleryImages.length}
            </ThemedText>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1c1c1e',
  },

  /* Floating Header Bar */
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    zIndex: 20,
  },
  headerTitleText: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff3b30',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '900',
  },

  /* Main Swiper */
  scrollContent: {
    paddingBottom: 60,
  },
  swiperContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    position: 'relative',
    backgroundColor: '#f4f4f5',
  },
  swiperImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  imageCounterPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },

  /* Details Section */
  infoSection: {
    padding: 12,
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  trendsBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  trendsText: {
    color: '#7e22ce',
    fontSize: 9.5,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  storeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  mainPriceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 12,
    fontWeight: '800',
    marginRight: 1,
  },
  integerPrice: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  decimalPrice: {
    fontSize: 13,
    fontWeight: '800',
  },
  discountTagPill: {
    backgroundColor: '#fff0ed',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  discountTagText: {
    color: '#FF5000',
    fontSize: 10,
    fontWeight: '800',
  },
  bestsellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 6,
  },
  bestsellerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706',
  },
  bestsellerSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#b45309',
  },
  salesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newArrivalBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  newArrivalText: {
    fontSize: 9,
    fontWeight: '800',
  },
  soldText: {
    fontSize: 11,
    fontWeight: '500',
  },

  /* Section Cards */
  sectionCard: {
    padding: 12,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  sectionTitleSub: {
    fontSize: 13.5,
    fontWeight: '400',
  },

  /* Colors */
  colorScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  colorBox: {
    width: 50,
    height: 62,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  colorThumbImage: {
    width: '100%',
    height: '100%',
  },
  colorDotBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffffff',
  },

  /* Size Selector */
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sizePill: {
    width: 44,
    height: 34,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  measurementsBox: {
    padding: 10,
    borderRadius: 4,
  },
  measurementsText: {
    fontSize: 11,
    lineHeight: 16,
  },

  /* Shipping Block */
  shippingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  shippingTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  shippingItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },
  freeShippingText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
  },
  estDeliveryText: {
    fontSize: 11,
    marginTop: 2,
  },
  shippingItemLabel: {
    fontSize: 12.5,
    fontWeight: '500',
  },

  /* Modal High Res Dark Viewer */
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  modalImageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.85,
  },
  modalCounterPill: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 15,
  },
  modalCounterText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
