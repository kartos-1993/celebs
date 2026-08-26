import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  ChevronRight,
  Heart,
  MoreHorizontal,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { showToast } from '@/components/toast/toast';
import { Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { useCart } from '@/features/cart/context/cart-context';
import { useCartSheet } from '@/features/cart/context/cart-sheet-context';
import { useFlyToCart } from '@/features/cart/context/fly-to-cart-context';
import { ProductGallery } from '@/features/products/components/product-gallery';
import { ProductVariantSelector } from '@/features/products/components/product-variant-selector';
import { SizeRequiredModal } from '@/features/products/components/size-required-modal';
import { resolveImageUrl, useProduct } from '@/features/products/hooks/use-products';
import { styles } from '@/features/products/styles/product.styles';
import {
  isProductFullyOutOfStock,
  isSelectedCombinationOutOfStock,
} from '@/features/products/utils/stock';
import { useWishlistActions, useWishlistStatus } from '@/features/wishlist/hooks/use-wishlist';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const { addToCart, itemCount } = useCart();
  const { openCartSheet } = useCartSheet();
  const { product, loading, error } = useProduct(id || '');
  const { startFlyAnimation, setCartIconCoords, pulseTrigger } = useFlyToCart();
  const topCartBtnRef = useRef<View>(null);
  const topCartScale = useSharedValue(1);

  // Component States
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Wishlist (server-backed)
  const { isWishlisted } = useWishlistStatus();
  const { addToWishlist, removeFromWishlist } = useWishlistActions();
  const isFavorite = id ? isWishlisted(String(id)) : false;

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

  const isFullyOutOfStock = isProductFullyOutOfStock(product);
  const isSelectedOutOfStock = isSelectedCombinationOutOfStock(
    product,
    selectedColorIndex,
    selectedSize,
  );
  // If any size is selectable, OOS is decided by the chosen combo; otherwise the whole product
  const isAddToCartDisabled = isFullyOutOfStock || (selectedSize ? isSelectedOutOfStock : false);

  const handleAddToCart = async (overrideSize?: string) => {
    if (!product) return;
    const finalSize = overrideSize || selectedSize;
    const currentVariant = product.colorVariants?.[selectedColorIndex];
    const finalSizeQty = (() => {
      const stocks = currentVariant?.stocks;
      if (!stocks || stocks.length === 0 || !finalSize) return null;
      const entry = stocks.find((s) => s.size.toLowerCase() === finalSize.toLowerCase());
      return entry ? (entry.quantity ?? null) : null;
    })();
    const isFinalSizeOutOfStock = finalSizeQty !== null && finalSizeQty <= 0;
    if (isFullyOutOfStock || isFinalSizeOutOfStock) {
      showToast('No stock available', { type: 'error' });
      return;
    }
    if (product.sizes && product.sizes.length > 0 && !finalSize) {
      setIsSizeModalOpen(true);
      return;
    }

    setIsAdding(true);
    try {
      await addToCart({
        productId: product.id,
        quantity: 1,
        size: finalSize || 'Standard',
        colorVariantName: product.colorVariants?.[selectedColorIndex]?.name || 'Standard',
      });
      // Fly only on success — no animation for OOS/failed adds
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
    } catch (err: unknown) {
      const raw =
        err instanceof Error && err.message
          ? err.message
          : 'Could not add to cart. Please try again.';
      // Shein-style: OOS errors are generic, without stock counts
      const isOosError = /exceeds available stock|out of stock/i.test(raw);
      showToast(isOosError ? 'No stock available' : raw, { type: 'error' });
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

  const handleHeaderMenu = () => {
    if (!product) return;
    Alert.alert(product.name, undefined, [
      { text: 'Share', onPress: handleShare },
      { text: 'View Cart', onPress: openCartSheet },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleWishlist = () => {
    if (!isLoggedIn || !product) {
      router.push('/(tabs)/me');
      return;
    }
    if (isFavorite) {
      removeFromWishlist.mutate(product.id);
    } else {
      addToWishlist.mutate(product.id);
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

      {/* Solid Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.back()}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color={Palette.gray900} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerSearchPill}
            onPress={() => router.push('/(tabs)/explore')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Search products"
          >
            <Search size={15} color={Palette.gray400} />
            <ThemedText style={styles.headerSearchText}>Search products</ThemedText>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleHeaderMenu}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <MoreHorizontal size={20} color={Palette.gray900} />
            </TouchableOpacity>

            <Animated.View style={animatedTopCartStyle}>
              <View ref={topCartBtnRef} onLayout={measureTopCartIcon}>
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={openCartSheet}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="View cart"
                >
                  <ShoppingBag size={20} color={Palette.gray900} />
                  {itemCount > 0 && (
                    <View style={styles.cartBadge}>
                      <ThemedText style={styles.cartBadgeText}>{itemCount}</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>

            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleShare}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Share product"
            >
              <Share2 size={19} color={Palette.gray900} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Product Image Gallery */}
        <View style={styles.galleryWrapper}>
          <View style={isAddToCartDisabled ? styles.galleryOosImage : undefined}>
            <ProductGallery images={galleryImages} productName={product.name} />
          </View>
          {isAddToCartDisabled && (
            <View style={styles.galleryOosOverlay} pointerEvents="none">
              <View style={styles.galleryOosBadge}>
                <ThemedText style={styles.galleryOosBadgeText}>OUT OF STOCK</ThemedText>
              </View>
            </View>
          )}
        </View>

        {/* Product Information Section */}
        <View style={styles.detailsContainer}>
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

          {/* Product Name + Rating */}
          <View style={styles.titleRow}>
            <ThemedText style={styles.productTitle} numberOfLines={2}>
              {product.name}
            </ThemedText>
            <View style={styles.ratingInline}>
              <Star size={13} color={Palette.gold} fill={Palette.gold} />
              <ThemedText style={styles.ratingInlineText}>4.8</ThemedText>
              <ThemedText style={styles.reviewsCount}>(124)</ThemedText>
              <ChevronRight size={13} color={Palette.gray400} />
            </View>
          </View>
        </View>

        {/* Section Band */}
        <View style={styles.sectionBand} />

        {/* Variants Section */}
        <View style={styles.detailsContainer}>
          {/* Variant Selector */}
          <ProductVariantSelector
            colorVariants={product.colorVariants}
            selectedColorIndex={selectedColorIndex}
            onSelectColor={handleColorChange}
            sizes={product.sizes}
            selectedSize={selectedSize}
            onSelectSize={setSelectedSize}
          />
        </View>

        {/* Section Band */}
        <View style={styles.sectionBand} />

        {/* Shipping & Services */}
        <View style={styles.detailsContainer}>
          <View style={styles.shippingSection}>
            <View style={[styles.serviceRow, styles.serviceRowDivider]}>
              <Truck size={18} color={Palette.gray800} />
              <ThemedText style={styles.serviceText}>
                Free Delivery{' '}
                <ThemedText style={styles.serviceHighlight}>on orders over Rs. 3,000</ThemedText>
              </ThemedText>
              <ChevronRight size={15} color={Palette.gray400} />
            </View>
            <View style={[styles.serviceRow, styles.serviceRowDivider]}>
              <RotateCcw size={18} color={Palette.gray800} />
              <ThemedText style={styles.serviceText}>Returns Accepted · 7-day policy</ThemedText>
              <ChevronRight size={15} color={Palette.gray400} />
            </View>
            <View style={styles.serviceRow}>
              <ShieldCheck size={18} color={Palette.gray800} />
              <ThemedText style={styles.serviceText}>Safe Payments · Privacy Protection</ThemedText>
              <ChevronRight size={15} color={Palette.gray400} />
            </View>
          </View>
        </View>

        {/* Section Band */}
        <View style={styles.sectionBand} />

        {/* Reviews */}
        <View style={styles.detailsContainer}>
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsSummaryRow}>
              <ThemedText style={styles.reviewsScore}>4.8</ThemedText>
              <Star size={15} color={Palette.gold} fill={Palette.gold} />
              <ThemedText style={styles.reviewsCount}>(124 reviews)</ThemedText>
              <View style={styles.reviewsViewMore}>
                <ThemedText style={styles.reviewsViewMoreText}>View more</ThemedText>
                <ChevronRight size={14} color={Palette.gray400} />
              </View>
            </View>
            <ThemedText style={styles.reviewsEmpty}>
              No written reviews yet — be the first to review this product.
            </ThemedText>
          </View>
        </View>

        {/* Section Band */}
        <View style={styles.sectionBand} />

        {/* Description */}
        <View style={styles.detailsContainer}>
          {product.description ? (
            <View style={styles.descriptionSection}>
              <ThemedText style={styles.sectionTitle}>Product Description</ThemedText>
              <ThemedText style={styles.descriptionText}>{product.description}</ThemedText>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={styles.wishlistBtn}
          onPress={handleWishlist}
          activeOpacity={0.85}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite ? 'Remove from wishlist' : 'Add to wishlist. Requires login.'
          }
        >
          <Heart
            size={20}
            color={isFavorite ? Palette.danger : Palette.gray700}
            fill={isFavorite ? Palette.danger : 'transparent'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addToCartBtn, isAddToCartDisabled && styles.addToCartBtnDisabled]}
          onPress={() => handleAddToCart()}
          disabled={isAdding || isAddToCartDisabled}
          activeOpacity={0.85}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={isAddToCartDisabled ? 'Out of stock' : 'Add product to cart'}
          accessibilityState={{ disabled: isAdding || isAddToCartDisabled }}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={Palette.white} />
          ) : (
            <ThemedText
              style={[styles.addToCartText, isAddToCartDisabled && styles.addToCartTextDisabled]}
            >
              {isAddToCartDisabled ? 'Out of Stock' : 'Add to Cart'}
            </ThemedText>
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
