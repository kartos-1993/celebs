import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StatusBar,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Heart,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useCart } from '@/features/cart/context/cart-context';
import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';
import { BrandStoryBadge } from '@/features/products/components/brand-story-badge';
import { FitRecommenderWidget } from '@/features/products/components/fit-recommender-widget';
import { ProductGallery } from '@/features/products/components/product-gallery';
import { ProductVariantSelector } from '@/features/products/components/product-variant-selector';
import { SizeRequiredModal } from '@/features/products/components/size-required-modal';
import { resolveImageUrl, useProduct } from '@/features/products/hooks/use-products';
import { styles } from '@/features/products/styles/product.styles';

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
        <ActivityIndicator size="large" color={Palette.brand} />
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
      <View style={[styles.headerOverlay, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => router.back()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color={Palette.gray900} />
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.headerIconButton} onPress={handleShare}>
            <Share2 size={20} color={Palette.gray900} />
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
                <ShoppingCart size={20} color={Palette.gray900} />
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
          {/* Brand Story Badge & Favorite */}
          <View style={styles.brandRow}>
            <View style={{ flex: 1 }}>
              <BrandStoryBadge
                brandName={product.brand}
                brandRef={(product as { brandRef?: unknown })?.brandRef as never}
              />
            </View>
            <TouchableOpacity
              onPress={() => setIsFavorite(!isFavorite)}
              style={{ marginLeft: Spacing.sm }}
            >
              <Heart
                size={22}
                color={isFavorite ? Palette.danger : Palette.gray400}
                fill={isFavorite ? Palette.danger : 'transparent'}
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
            <Star size={14} color={Palette.gold} fill={Palette.gold} />
            <ThemedText style={styles.ratingText}>4.8 (124 reviews)</ThemedText>
          </View>

          <View style={styles.divider} />

          {/* Fit Recommender Widget (Nepali Sizing Engine) */}
          <FitRecommenderWidget
            availableSizes={
              Array.isArray(product.sizes)
                ? product.sizes.map((s) => (typeof s === 'string' ? s : s.name))
                : ['S', 'M', 'L', 'XL', 'XXL']
            }
            selectedSize={selectedSize}
            onSelectSize={setSelectedSize}
          />

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
              <Truck size={20} color={Palette.brand} />
              <ThemedText style={styles.propTitle}>Fast Delivery</ThemedText>
              <ThemedText style={styles.propSub}>2-4 business days</ThemedText>
            </View>
            <View style={styles.propBox}>
              <RotateCcw size={20} color={Palette.brand} />
              <ThemedText style={styles.propTitle}>Easy Returns</ThemedText>
              <ThemedText style={styles.propSub}>7-day return policy</ThemedText>
            </View>
            <View style={styles.propBox}>
              <ShieldCheck size={20} color={Palette.brand} />
              <ThemedText style={styles.propTitle}>100% Genuine</ThemedText>
              <ThemedText style={styles.propSub}>Authentic products</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
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
            <ActivityIndicator size="small" color={Palette.white} />
          ) : (
            <>
              <ShoppingCart size={20} color={Palette.white} />
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

