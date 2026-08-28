import { useState } from 'react';
import { ScrollView, Share, StatusBar, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/context/auth-context';
import { useCart } from '@/features/cart/context/cart-context';
import { useCartSheet } from '@/features/cart/context/cart-sheet-context';
import { ProductBottomBar } from '@/features/products/components/product-bottom-bar';
import { ProductDescriptionCard } from '@/features/products/components/product-description-card';
import { ProductDetailHeader } from '@/features/products/components/product-detail-header';
import { ProductDetailState } from '@/features/products/components/product-detail-state';
import { ProductGallery } from '@/features/products/components/product-gallery';
import { ProductPriceCard } from '@/features/products/components/product-price-card';
import { ProductReviewsCard } from '@/features/products/components/product-reviews-card';
import { ProductServicesCard } from '@/features/products/components/product-services-card';
import { ProductVariantSelector } from '@/features/products/components/product-variant-selector';
import { SizeRequiredModal } from '@/features/products/components/size-required-modal';
import { useProductDetailCart } from '@/features/products/hooks/use-product-detail-cart';
import { useProduct } from '@/features/products/hooks/use-products';
import { styles } from '@/features/products/styles/product.styles';
import {
  isProductFullyOutOfStock,
  isSelectedCombinationOutOfStock,
  isSizeOutOfStockForVariant,
} from '@/features/products/utils/stock';
import { useWishlistActions, useWishlistStatus } from '@/features/wishlist/hooks/use-wishlist';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { itemCount } = useCart();
  const { openCartSheet } = useCartSheet();
  const { product, loading, error } = useProduct(id || '');

  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);

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

  if (loading || error || !product) {
    return <ProductDetailState loading={loading} error={error} onBack={() => router.back()} />;
  }

  const galleryImages =
    product.colorVariants?.[selectedColorIndex]?.images &&
    product.colorVariants[selectedColorIndex].images!.length > 0
      ? product.colorVariants[selectedColorIndex].images!
      : product.mainImages || [];

  const availableSizeNames = product.sizes ? product.sizes.map((s) => s.name) : [];

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

        <ProductPriceCard
          name={product.name}
          price={product.price}
          discountedPrice={product.discountedPrice}
        />

        <View style={styles.sectionBand} />

        <View style={styles.detailsContainer}>
          <ProductVariantSelector
            colorVariants={product.colorVariants}
            selectedColorIndex={selectedColorIndex}
            onSelectColor={handleColorChange}
            sizes={product.sizes}
            selectedSize={selectedSize}
            onSelectSize={setSelectedSize}
          />
        </View>

        <View style={styles.sectionBand} />
        <ProductServicesCard />
        <View style={styles.sectionBand} />
        <ProductReviewsCard />
        <ProductDescriptionCard description={product.description} />
      </ScrollView>

      <ProductBottomBar
        isFavorite={isFavorite}
        isAdding={isAdding}
        isAddToCartDisabled={isAddToCartDisabled}
        onToggleWishlist={handleWishlist}
        onAddToCart={() => handleAddToCart()}
      />

      <SizeRequiredModal
        visible={isSizeModalOpen}
        onClose={() => setIsSizeModalOpen(false)}
        availableSizes={availableSizeNames}
        disabledSizes={availableSizeNames.filter((s) =>
          isSizeOutOfStockForVariant(product.colorVariants?.[selectedColorIndex], s),
        )}
        productName={product.name}
        initialSize={selectedSize}
        imageUrl={
          product.colorVariants?.[selectedColorIndex]?.images?.[0] || product.mainImages?.[0]
        }
        price={product.price}
        discountedPrice={product.discountedPrice}
        selectedColorName={product.colorVariants?.[selectedColorIndex]?.name}
        onSelectSizeAndConfirm={(chosenSize) => {
          setSelectedSize(chosenSize);
          setIsSizeModalOpen(false);
          handleAddToCart(chosenSize);
        }}
      />
    </ThemedView>
  );
}
