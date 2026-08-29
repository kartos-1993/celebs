import { Share, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

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
} from '@/features/products/utils/stock';
import { useWishlistActions, useWishlistStatus } from '@/features/wishlist/hooks/use-wishlist';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { itemCount } = useCart();
  const { openCartSheet } = useCartSheet();
  const { product, loading, error } = useProduct(id || '');

  const {
    selectedColorIndex,
    selectedSize,
    setSelectedSize,
    isSizeModalOpen,
    setIsSizeModalOpen,
    handleColorChange,
  } = useProductVariantSelection(product);

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

  if (loading || error || !product) {
    return <ProductDetailState loading={loading} error={error} onBack={() => router.back()} />;
  }

  const galleryImages =
    product.colorVariants?.[selectedColorIndex]?.images &&
    product.colorVariants[selectedColorIndex].images!.length > 0
      ? product.colorVariants[selectedColorIndex].images!
      : product.mainImages || [];

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
        product={product}
        galleryImages={galleryImages}
        isOutOfStock={isAddToCartDisabled}
        selectedColorIndex={selectedColorIndex}
        selectedSize={selectedSize}
        onSelectColor={handleColorChange}
        onSelectSize={setSelectedSize}
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
        product={product}
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
