import React from 'react';
import { View } from 'react-native';

import { useProductCard } from '../hooks/use-product-card';
import { Product } from '../hooks/use-products';

import { styles } from './product-card.styles';
import { ProductCardImageGallery } from './product-card-image-gallery';
import { ProductCardInfo } from './product-card-info';

import { Palette } from '@/constants/theme';

interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  isFirstCard?: boolean;
}

export function ProductCard({
  product,
  onPress,
  onAddToCart,
  isFirstCard = false,
}: ProductCardProps) {
  const {
    CARD_WIDTH,
    selectedColorIndex,
    activeImageIndex,
    isFavorite,
    isWishlistBusy,
    imageRef,
    scrollViewRef,
    hintAnim,
    dpr,
    cardImages,
    priceColor,
    integerPart,
    decimalPart,
    hasDiscount,
    discountPercent,
    storeName,
    isOutOfStock,
    handleToggleWishlist,
    handleSelectColor,
    handleScroll,
    handlePress,
    handleAddToCart,
  } = useProductCard({ product, onPress, onAddToCart, isFirstCard });

  return (
    <View style={[styles.cardContainer, { width: CARD_WIDTH, backgroundColor: Palette.white }]}>
      <ProductCardImageGallery
        cardWidth={CARD_WIDTH}
        cardImages={cardImages}
        activeImageIndex={activeImageIndex}
        hintAnim={hintAnim}
        dpr={dpr}
        isOutOfStock={isOutOfStock}
        isFavorite={isFavorite}
        isWishlistBusy={isWishlistBusy}
        imageRef={imageRef}
        scrollViewRef={scrollViewRef}
        product={product}
        selectedColorIndex={selectedColorIndex}
        onPress={handlePress}
        onScroll={handleScroll}
        onToggleWishlist={handleToggleWishlist}
        onSelectColor={handleSelectColor}
      />

      <ProductCardInfo
        storeName={storeName}
        productName={product.name}
        priceColor={priceColor}
        integerPart={integerPart}
        decimalPart={decimalPart}
        hasDiscount={hasDiscount}
        discountPercent={discountPercent}
        isOutOfStock={isOutOfStock}
        onPress={handlePress}
        onAddToCart={handleAddToCart}
      />
    </View>
  );
}
