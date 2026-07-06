import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PRODUCTS } from '@/constants/mock-data';
import { useAuthStore } from '@/store/auth-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { isAuthenticated, login } = useAuthStore();

  const product = useMemo(() => {
    return PRODUCTS.find((p) => p.id === id);
  }, [id]);

  // Active state selectors
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Lazy Auth Modal
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authActionType, setAuthActionType] = useState<'cart' | 'wishlist'>('cart');

  const activeColorVariant = useMemo(() => {
    if (!product) return null;
    return product.colorVariants[selectedColorIndex];
  }, [product, selectedColorIndex]);
  
  // Use images specific to the selected color variant if available; fall back to product mainImages
  const galleryImages = useMemo(() => {
    if (!product) return [];
    if (activeColorVariant?.images && activeColorVariant.images.length > 0) {
      return activeColorVariant.images;
    }
    return product.mainImages;
  }, [product, activeColorVariant]);

  // Determine stock for each size based on selected color variant
  const sizeStocks = useMemo(() => {
    const stocksMap: Record<string, number> = {};
    if (!activeColorVariant) return stocksMap;
    activeColorVariant.stocks.forEach((s) => {
      stocksMap[s.size] = s.quantity;
    });
    return stocksMap;
  }, [activeColorVariant]);

  const activeMeasurements = useMemo(() => {
    if (!selectedSize || !product) return null;
    const sizeObj = product.sizes.find((s) => s.name === selectedSize);
    return sizeObj?.productMeasurements ?? null;
  }, [selectedSize, product]);

  // Early return if product doesn't exist (after all hooks have executed)
  if (!product || !activeColorVariant) {
    return (
      <ThemedView style={styles.errorContainer}>
        <SymbolView name={{ ios: 'exclamationmark.triangle', android: 'error', web: 'error' }} size={40} tintColor="#FF3B30" />
        <ThemedText style={styles.errorText}>Product not found</ThemedText>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const handleActionClick = (type: 'cart' | 'wishlist') => {
    if (type === 'cart' && !selectedSize) {
      Alert.alert('Selection Required', 'Please select a size before adding to bag.', [
        { text: 'OK' },
      ]);
      return;
    }

    if (isAuthenticated) {
      // Proceed directly if logged in
      Alert.alert(
        'Success',
        `Successfully added ${product.name} (${selectedSize ? `Size ${selectedSize}, ` : ''}${activeColorVariant.name}) to your ${type === 'cart' ? 'bag' : 'wishlist'}.`,
        [{ text: 'OK' }]
      );
    } else {
      // Trigger Lazy Auth Modal
      setAuthActionType(type);
      setAuthModalVisible(true);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthModalVisible(false);
    
    // Perform simulated login storing in SecureStore via authStore
    await login('mock_google_oauth_jwt_token', {
      id: 'usr-google-101',
      name: 'Abishek Shrestha',
      email: 'abishek@celebs.com',
      role: 'CUSTOMER',
    });

    Alert.alert(
      'Google Sign-In Success',
      `Welcome back, Abishek! Item successfully added to your ${authActionType === 'cart' ? 'bag' : 'wishlist'}.`,
      [{ text: 'Continue' }]
    );
  };

  const originalPrice = product.price;
  const currentPrice = product.discountedPrice ?? product.price;
  const hasDiscount = !!product.discountedPrice;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  return (
    <ThemedView style={styles.container}>
      {/* Absolute Back & Action Header */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + Spacing.two }]}>
        <Pressable
          style={({ pressed }) => [
            styles.roundHeaderBtn,
            { backgroundColor: theme.background },
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={20}
            tintColor={theme.text}
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.roundHeaderBtn,
            { backgroundColor: theme.background },
            pressed && styles.pressed,
          ]}
          onPress={() => handleActionClick('wishlist')}>
          <SymbolView
            name={{ ios: 'heart', android: 'favorite', web: 'favorite' }}
            size={20}
            tintColor={theme.text}
          />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const idx = Math.round(offsetX / SCREEN_WIDTH);
              if (idx !== activeImageIndex) setActiveImageIndex(idx);
            }}
            scrollEventThrottle={16}>
            {galleryImages.map((imgUrl, index) => (
              <Image
                key={index}
                source={imgUrl}
                style={styles.carouselImage}
                contentFit="cover"
              />
            ))}
          </ScrollView>

          {/* Dots Indicator */}
          {galleryImages.length > 1 && (
            <View style={styles.dotsContainer}>
              {galleryImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        index === activeImageIndex ? theme.text : theme.textSecondary + '60',
                      width: index === activeImageIndex ? 16 : 6,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Content Details */}
        <View style={styles.detailsContainer}>
          {/* Brand & Title */}
          <ThemedText style={styles.brand} themeColor="textSecondary">
            {product.brand}
          </ThemedText>
          <ThemedText style={styles.title}>{product.name}</ThemedText>

          {/* Review Stats */}
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <SymbolView
                  key={s}
                  name={{ ios: 'star.fill', android: 'star', web: 'star' }}
                  size={14}
                  tintColor={s <= Math.floor(product.rating) ? '#FFD700' : '#C7C7CC'}
                />
              ))}
            </View>
            <ThemedText style={styles.ratingText} themeColor="textSecondary">
              {product.rating} ({product.reviewsCount} reviews)
            </ThemedText>
          </View>

          {/* Pricing */}
          <View style={styles.priceContainer}>
            <ThemedText style={styles.price}>${currentPrice.toFixed(2)}</ThemedText>
            {hasDiscount && (
              <>
                <ThemedText style={styles.originalPrice}>${originalPrice.toFixed(2)}</ThemedText>
                <View style={styles.discountTag}>
                  <ThemedText style={styles.discountTagText}>{discountPercent}% OFF</ThemedText>
                </View>
              </>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Color Selection */}
          <ThemedText style={styles.sectionHeader}>Color: {activeColorVariant.name}</ThemedText>
          <View style={styles.colorGrid}>
            {product.colorVariants.map((variant, index) => {
              const isSelected = selectedColorIndex === index;
              return (
                <Pressable
                  key={variant.name}
                  style={[
                    styles.colorOuter,
                    { borderColor: isSelected ? theme.text : 'transparent' },
                  ]}
                  onPress={() => {
                    setSelectedColorIndex(index);
                    setActiveImageIndex(0);
                    setSelectedSize(null); // Reset size when changing color variant
                  }}>
                  <View style={[styles.colorInner, { backgroundColor: variant.colorCode }]} />
                </Pressable>
              );
            })}
          </View>

          {/* Size Selection */}
          <View style={styles.sizeSectionHeader}>
            <ThemedText style={styles.sectionHeader}>Size</ThemedText>
            {selectedSize && (
              <ThemedText style={styles.sizeMeasurementsTitle} themeColor="textSecondary">
                Dimensions
              </ThemedText>
            )}
          </View>

          <View style={styles.sizeSelectionRow}>
            <View style={styles.sizeChips}>
              {product.sizes.map((size) => {
                const stockQty = sizeStocks[size.name] || 0;
                const isOutOfStock = stockQty === 0;
                const isSelected = selectedSize === size.name;

                return (
                  <Pressable
                    key={size.name}
                    disabled={isOutOfStock}
                    style={[
                      styles.sizeChip,
                      {
                        backgroundColor: isSelected
                          ? theme.text
                          : theme.backgroundElement,
                        opacity: isOutOfStock ? 0.35 : 1,
                      },
                    ]}
                    onPress={() => setSelectedSize(size.name)}>
                    <ThemedText
                      style={[
                        styles.sizeChipText,
                        {
                          color: isSelected ? theme.background : theme.text,
                          textDecorationLine: isOutOfStock ? 'line-through' : 'none',
                        },
                      ]}>
                      {size.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Display Measurements Dynamically */}
            {activeMeasurements && (
              <View style={[styles.measurementsTable, { backgroundColor: theme.backgroundElement }]}>
                {activeMeasurements.map((m) => (
                  <View key={m.name} style={styles.measurementRow}>
                    <ThemedText style={styles.measurementLabel} themeColor="textSecondary">
                      {m.name}
                    </ThemedText>
                    <ThemedText style={styles.measurementValue}>
                      {m.value} {m.unit}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          <ThemedText style={styles.sectionHeader}>Product Description</ThemedText>
          <ThemedText style={styles.descriptionText} themeColor="textSecondary">
            {product.description}
          </ThemedText>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, Spacing.three),
            borderTopColor: theme.backgroundElement,
          },
        ]}>
        <Pressable
          style={({ pressed }) => [
            styles.bagButton,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}
          onPress={() => handleActionClick('cart')}>
          <SymbolView
            name={{ ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }}
            size={18}
            tintColor={theme.background}
          />
          <ThemedText style={[styles.bagButtonText, { color: theme.background }]}>
            Add to Bag
          </ThemedText>
        </Pressable>
      </View>

      {/* Lazy Auth Google Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={authModalVisible}
        onRequestClose={() => setAuthModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <ThemedView style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalIndicator} />
            
            <SymbolView
              name={{ ios: 'lock.shield.fill', android: 'security', web: 'security' }}
              size={50}
              tintColor={theme.text}
              style={styles.modalLockIcon}
            />
            
            <ThemedText style={styles.modalTitle}>Join Celebs Fashion</ThemedText>
            <ThemedText style={styles.modalSubtitle} themeColor="textSecondary">
              Authenticate now to add this product to your {authActionType === 'cart' ? 'bag' : 'wishlist'} and build your personalized style feed.
            </ThemedText>

            {/* Google Sign In Button */}
            <Pressable
              style={({ pressed }) => [
                styles.googleButton,
                pressed && styles.pressed,
              ]}
              onPress={handleGoogleLogin}>
              <Image
                source="https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=100" // Simple Google emblem representation or standard logo
                style={styles.googleIcon}
              />
              <ThemedText style={styles.googleButtonText}>Continue with Google</ThemedText>
            </Pressable>

            {/* Cancel Button */}
            <Pressable
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              onPress={() => setAuthModalVisible(false)}>
              <ThemedText style={styles.cancelButtonText} themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  backButton: {
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: '#000',
    borderRadius: Spacing.one,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  floatingHeader: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },
  roundHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  carouselContainer: {
    height: SCREEN_WIDTH * 1.25, // Aspect ratio 4:5 for fashion imagery
    position: 'relative',
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: Spacing.three,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  detailsContainer: {
    padding: Spacing.three,
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.one,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
  },
  originalPrice: {
    fontSize: 16,
    color: '#8A8A8F',
    textDecorationLine: 'line-through',
  },
  discountTag: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  discountTagText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginVertical: Spacing.three,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  colorOuter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sizeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  sizeMeasurementsTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  sizeSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  sizeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    flex: 1,
  },
  sizeChip: {
    width: 48,
    height: 48,
    borderRadius: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  measurementsTable: {
    padding: Spacing.two,
    borderRadius: Spacing.one,
    width: 140,
    gap: 4,
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  measurementLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  measurementValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bagButton: {
    height: 50,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bagButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    alignItems: 'center',
  },
  modalIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    marginBottom: Spacing.four,
  },
  modalLockIcon: {
    marginBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.four,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: Spacing.two,
    height: 48,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  googleButtonText: {
    color: '#3C4043',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
