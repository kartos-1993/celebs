import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Product } from '@/api/mobileClient';
import { SHADOWS } from '@/constants/platform';
// import { ShoppingCart } from 'expo-symbols'; // Assuming expo-symbols is used

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
}

export const ProductCard = React.memo(({ product, onPress, onAddToCart }: ProductCardProps) => {
  return (
    <Pressable 
      className="flex-1 m-1 bg-white rounded-lg overflow-hidden" 
      style={SHADOWS.light}
      onPress={onPress}
    >
      <View className="relative w-full aspect-[3/4]">
        <Image
          source={product.mainImage || 'https://via.placeholder.com/300x400'}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
        {product.badge && (
          <View className="absolute bottom-2 left-2 bg-green-700 px-2 py-1 rounded">
            <Text className="text-white text-xs font-bold">{product.badge}</Text>
          </View>
        )}
      </View>
      
      <View className="p-2">
        <Text className="text-charcoal text-sm font-medium leading-tight" numberOfLines={2}>
          {product.name}
        </Text>
        
        {/* Color Swatches */}
        {product.availableColors && product.availableColors.length > 0 && (
          <View className="flex-row mt-1">
            {product.availableColors.slice(0, 4).map((color, idx) => (
              <View 
                key={`${product.id}-${color}-${idx}`} 
                className="w-3 h-3 rounded-full border border-gray-200"
                style={{ 
                  backgroundColor: color, 
                  marginLeft: idx > 0 ? -4 : 0,
                  zIndex: 10 - idx
                }} 
              />
            ))}
            {product.availableColors.length > 4 && (
              <Text className="text-[10px] text-gray-500 ml-1">+{product.availableColors.length - 4}</Text>
            )}
          </View>
        )}

        <View className="flex-row items-end justify-between mt-2">
          <View>
            <Text className="text-red-600 font-bold text-lg">£{product.price.toFixed(2)}</Text>
            {product.discount > 0 && (
              <View className="flex-row items-center">
                <Text className="text-gray-400 text-xs line-through">
                  £{((product.price * 100) / (100 - product.discount)).toFixed(2)}
                </Text>
                <Text className="text-red-500 text-[10px] ml-1 bg-red-50 px-1 rounded">-{product.discount}%</Text>
              </View>
            )}
          </View>
          
          <Pressable 
            onPress={onAddToCart}
            className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
            hitSlop={10}
          >
            {/* Simple plus icon if we don't have symbols */}
            <Text className="text-charcoal text-lg font-bold">+</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});
