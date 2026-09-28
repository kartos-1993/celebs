import { useCallback, useMemo, useRef } from 'react';
import { Share, StatusBar } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/context/auth-context';
import { useCart } from '@/features/cart/context/cart-context';
import { useCartSheet } from '@/features/cart/context/cart-sheet-context';
import { ProductBottomBar } from '@/features/products/components/product-bottom-bar';
import { ProductDetailHeader } from '@/features/products/components/product-detail-header';
import { ProductDetailScrollContent } from '@/features/products/components/product-detail-scroll-content';
import { ProductDetailSizeModal } from '@/features/products/components/product-detail-size-modal';
import { ProductDetailState } from '@/features/products/components/product-detail-state';
import { useProductDetailCart } from '@/features/products/hooks/use-product-detail-cart';
import { useProductVariantSelection } from '@/features/products/hooks/use-product-variant-selection';
import { useProduct } from '@/features/products/hooks/use-products';
import { styles } from '@/features/products/styles/product.styles';
import {
  isProductFullyOutOfStock,
  isSelectedCombinationOutOfStock,
  resolveProductSizes,
} from '@/features/products/utils/stock';
import { useWishlistActions, useWishlistStatus } from '@/features/wishlist/hooks/use-wishlist';
import { hasRenderableImage } from '@/utils/image';

export default function ProductDetailScreen() {
  const { id, color } = useLocalSearchParams<{ id: string; color?: string }>();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { itemCount } = useCart();
  const { openCartSheet } = useCartSheet();
  const { product, loading, error, refetch, refreshing } = useProduct(id || '');

  // Revalidate on every foreground: the cached copy may predate an edit.
  // Skipped on first mount (the initial fetch already covers it).
  const focusedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnceRef.current) {
        refetch();
      } else {
        focusedOnceRef.current = true;
      }
    }, [refetch]),
  );

  // Display sizes fall back through variant options to tracked stocks,
  // so the section can never blank while sizing data exists anywhere.
  const displayProduct = useMemo(
    () =>
      product && (!product.sizes || product.sizes.length === 0)
        ? { ...product, sizes: resolveProductSizes(product) }
        : product,
    [product],
  );

  const {
    selectedColorIndex,
    selectedSize,
    setSelectedSize,
    isSizeModalOpen,
    setIsSizeModalOpen,
    handleColorChange,
  } = useProductVariantSelection(displayProduct, Array.isArray(color) ? color[0] : color);

  const { isWishlisted } = useWishlistStatus();
  const { addToWishlist, removeFromWishlist } = useWishlistActions();
  const isFavorite = id ? isWishlisted(String(id)) : false;

  const isFullyOutOfStock = isProductFullyOutOfStock(product);
  const isSelectedOutOfStock = isSelectedCombinationOutOfStock(
    product,
    selectedColorIndex,
    selectedSize,
  );
  const isAddToCartDisabled = isFullyOutOfStock || (selectedSize ? isSelectedOutOfStock : false);

  const { isAdding, handleAddToCart, measureTopCartIcon, animatedTopCartStyle, topCartBtnRef } =
    useProductDetailCart({
      product,
      selectedColorIndex,
      selectedSize,
      isFullyOutOfStock,
      onOpenSizeModal: () => setIsSizeModalOpen(true),
    });

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({ message: `Check out ${product.name} on Celebs!` });
    } catch {
      // Cancelled
    }
  };

  const isWishlistBusy = addToWishlist.isPending || removeFromWishlist.isPending;

  const handleWishlist = () => {
    if (!isLoggedIn || !product) {
      router.push('/(tabs)/me');
      return;
    }
    if (isWishlistBusy) return;
    if (isFavorite) {
      removeFromWishlist.mutate(product.id);
    } else {
      addToWishlist.mutate(product.id);
    }
  };

  // `cover` is the derived primary the API sends to storefront clients; the
  // selected colour's own gallery wins when it has photos. `mainImages` is
  // never part of this payload, so it must not appear in the chain. Declared
  // above the loading early-return because it is a hook.
  const galleryImages = useMemo(() => {
    const variantImages = product?.colorVariants?.[selectedColorIndex]?.images;
    if (Array.isArray(variantImages) && variantImages.length > 0) {
      return variantImages.filter((img): img is string => hasRenderableImage(img));
    }
    const cover = product?.cover?.trim();
    return cover ? [cover] : [];
  }, [product, selectedColorIndex]);

  if (loading || error || !product) {
    return <ProductDetailState loading={loading} error={error} onBack={() => router.back()} />;
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ProductDetailHeader
        itemCount={itemCount}
        topCartBtnRef={topCartBtnRef}
        animatedTopCartStyle={animatedTopCartStyle}
        onLayoutCartIcon={measureTopCartIcon}
        onOpenCart={openCartSheet}
        onShare={handleShare}
      />

      <ProductDetailScrollContent
        product={displayProduct ?? product}
        galleryImages={galleryImages}
        isOutOfStock={isAddToCartDisabled}
        selectedColorIndex={selectedColorIndex}
        selectedSize={selectedSize}
        onSelectColor={handleColorChange}
        onSelectSize={setSelectedSize}
        onAddToCart={() => handleAddToCart()}
        refreshing={refreshing}
        onRefresh={() => refetch()}
      />

      <ProductBottomBar
        isFavorite={isFavorite}
        isAdding={isAdding}
        isAddToCartDisabled={isAddToCartDisabled}
        onToggleWishlist={handleWishlist}
        onAddToCart={() => handleAddToCart()}
      />

      <ProductDetailSizeModal
        visible={isSizeModalOpen}
        onClose={() => setIsSizeModalOpen(false)}
        product={displayProduct ?? product}
        selectedColorIndex={selectedColorIndex}
        selectedSize={selectedSize}
        onSelectSizeAndConfirm={(chosenSize) => {
          setSelectedSize(chosenSize);
          setIsSizeModalOpen(false);
          handleAddToCart(chosenSize);
        }}
      />
    </ThemedView>
  );
}
