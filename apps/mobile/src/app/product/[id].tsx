import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Heart,
  ShoppingCart,
  Share2,
  Truck,
  RotateCcw,
  ShieldCheck,
  Star,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProduct, resolveImageUrl } from '@/features/products/hooks/use-products';
import { useCart } from '@/features/cart/context/cart-context';
import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';
import { ProductGallery } from '@/features/products/components/ProductGallery';
import { ProductVariantSelector } from '@/features/products/components/ProductVariantSelector';
import { SizeRequiredModal } from '@/features/products/components/size-required-modal';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addToCart, itemCount } = useCart();
  const { product, loading, error } = useProduct(id || '');
  const { startFlyAnimation, setCartIconCoords, pulseTrigger } = useFlyToCart();
  const topCartBtnRef = useRef<View>(null);
  const topCartScale = useSharedValue(1);

  // Component States
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Measure top header cart icon position for fly animation
  const measureTopCartIcon = useCallback(() => {
    setTimeout(() => {
      if (!isMountedRef.current) return;
      topCartBtnRef.current?.measureInWindow((x, y, width, height) => {
        if (
          isMountedRef.current &&
          typeof x === 'number' &&
          typeof y === 'number' &&
          x > 0 &&
          y > 0
        ) {
          setCartIconCoords({
            x: x + width / 2,
            y: y + height / 2,
          });
        }
      });
    }, 100);
  }, [setCartIconCoords]);

  // Pulse effect on cart icon when item added
  useEffect(() => {
    if (pulseTrigger > 0) {
      topCartScale.value = withSequence(
        withSpring(1.4, { damping: 6, stiffness: 200 }),
        withSpring(1.0, { damping: 10, stiffness: 180 }),
      );
    }
  }, [pulseTrigger, topCartScale]);

  const animatedTopCartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: topCartScale.value }],
  }));

  const handleAddToCart = async (overrideSize?: string) => {
    if (!product) return;
    const finalSize = overrideSize || selectedSize;
    if (product.sizes && product.sizes.length > 0 && !finalSize) {
      setIsSizeModalOpen(true);
      return;
    }

    // Trigger Fly-to-Cart animation
    const flyImage =
      product.colorVariants?.[selectedColorIndex]?.images?.[0] || product.mainImages?.[0] || '';
    if (flyImage) {
      startFlyAnimation({
        imageUrl: resolveImageUrl(flyImage),
        startX: 180,
        startY: 500,
        startWidth: 100,
        startHeight: 120,
      });
    }

    setIsAdding(true);
    try {
      await addToCart({
        productId: product.id,
        quantity: 1,
        size: finalSize || 'Standard',
        colorVariantName: product.colorVariants?.[selectedColorIndex]?.name || 'Standard',
      });
    } catch {
      // Error handled in store
    } finally {
      setIsAdding(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Check out ${product.name} on Celebs!`,
      });
    } catch {
      // Share cancelled
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#208AEF" />
        <ThemedText style={styles.loadingText}>Loading product details...</ThemedText>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centerBox}>
        <ThemedText style={styles.errorText}>{error || 'Product not found.'}</ThemedText>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ThemedText style={styles.backBtnText}>Go Back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  const galleryImages =
    product.colorVariants?.[selectedColorIndex]?.images &&
    product.colorVariants[selectedColorIndex].images!.length > 0
      ? product.colorVariants[selectedColorIndex].images!
      : product.mainImages || [];

  const originalPrice = product.price;
  const currentPrice = product.discountedPrice || product.price;
  const discountPercent =
    originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : 0;

  const availableSizeNames = product.sizes ? product.sizes.map((s) => s.name) : [];

  const handleColorChange = (index: number) => {
    setSelectedColorIndex(index);
    const newVariant = product?.colorVariants?.[index];
    if (selectedSize && newVariant?.stocks) {
      const stockItem = newVariant.stocks.find(
        (st) => st.size.toLowerCase() === selectedSize.toLowerCase(),
      );
      if (!stockItem || stockItem.quantity <= 0) {
        setSelectedSize('');
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Floating Header */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => router.back()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color="#18181b" />
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.headerIconButton} onPress={handleShare}>
            <Share2 size={20} color="#18181b" />
          </TouchableOpacity>

          <Animated.View style={animatedTopCartStyle}>
            <View ref={topCartBtnRef} onLayout={measureTopCartIcon}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push('/cart')}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="View cart"
              >
                <ShoppingCart size={20} color="#18181b" />
                {itemCount > 0 && (
                  <View style={styles.cartBadge}>
                    <ThemedText style={styles.cartBadgeText}>{itemCount}</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Product Image Gallery */}
        <ProductGallery images={galleryImages} productName={product.name} />

        {/* Product Information Section */}
        <View style={styles.detailsContainer}>
          {/* Brand & Favorite */}
          <View style={styles.brandRow}>
            <ThemedText style={styles.brandText}>{product.brand || 'Celebs Exclusive'}</ThemedText>
            <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)}>
              <Heart
                size={22}
                color={isFavorite ? '#ef4444' : '#9ca3af'}
                fill={isFavorite ? '#ef4444' : 'transparent'}
              />
            </TouchableOpacity>
          </View>

          {/* Product Name */}
          <ThemedText style={styles.productTitle}>{product.name}</ThemedText>

          {/* Pricing Row */}
          <View style={styles.priceRow}>
            <ThemedText style={styles.currentPrice}>Rs. {currentPrice.toLocaleString()}</ThemedText>
            {discountPercent > 0 && (
              <>
                <ThemedText style={styles.originalPrice}>
                  Rs. {originalPrice.toLocaleString()}
                </ThemedText>
                <View style={styles.discountBadge}>
                  <ThemedText style={styles.discountText}>{discountPercent}% OFF</ThemedText>
                </View>
              </>
            )}
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <Star size={14} color="#eab308" fill="#eab308" />
            <ThemedText style={styles.ratingText}>4.8 (124 reviews)</ThemedText>
          </View>

          <View style={styles.divider} />

          {/* Variant Selector */}
          <ProductVariantSelector
            colorVariants={product.colorVariants}
            selectedColorIndex={selectedColorIndex}
            onSelectColor={handleColorChange}
            sizes={product.sizes}
            selectedSize={selectedSize}
            onSelectSize={setSelectedSize}
          />

          <View style={styles.divider} />

          {/* Description */}
          {product.description ? (
            <View style={styles.descriptionSection}>
              <ThemedText style={styles.sectionTitle}>Product Description</ThemedText>
              <ThemedText style={styles.descriptionText}>{product.description}</ThemedText>
            </View>
          ) : null}

          {/* Value Props */}
          <View style={styles.valuePropsRow}>
            <View style={styles.propBox}>
              <Truck size={20} color="#208AEF" />
              <ThemedText style={styles.propTitle}>Fast Delivery</ThemedText>
              <ThemedText style={styles.propSub}>2-4 business days</ThemedText>
            </View>
            <View style={styles.propBox}>
              <RotateCcw size={20} color="#208AEF" />
              <ThemedText style={styles.propTitle}>Easy Returns</ThemedText>
              <ThemedText style={styles.propSub}>7-day return policy</ThemedText>
            </View>
            <View style={styles.propBox}>
              <ShieldCheck size={20} color="#208AEF" />
              <ThemedText style={styles.propTitle}>100% Genuine</ThemedText>
              <ThemedText style={styles.propSub}>Authentic products</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={() => handleAddToCart()}
          disabled={isAdding}
          activeOpacity={0.85}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Add product to cart"
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <ShoppingCart size={20} color="#ffffff" />
              <ThemedText style={styles.addToCartText}>Add to Cart</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Size Required Modal */}
      <SizeRequiredModal
        visible={isSizeModalOpen}
        onClose={() => setIsSizeModalOpen(false)}
        availableSizes={availableSizeNames}
        productName={product.name}
        initialSize={selectedSize}
        onSelectSizeAndConfirm={(chosenSize) => {
          setSelectedSize(chosenSize);
          setIsSizeModalOpen(false);
          handleAddToCart(chosenSize);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#208AEF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  detailsContainer: {
    padding: 16,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#208AEF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#18181b',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#18181b',
  },
  originalPrice: {
    fontSize: 16,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 16,
  },
  descriptionSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18181b',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  valuePropsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  propBox: {
    alignItems: 'center',
    flex: 1,
  },
  propTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18181b',
    marginTop: 6,
  },
  propSub: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  addToCartBtn: {
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
