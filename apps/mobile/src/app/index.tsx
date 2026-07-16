import React, { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Header } from '@/components/Header';
import { CategoryTabs } from '@/components/CategoryTabs';
import { PromoBanner } from '@/components/PromoBanner';
import { FilterChips } from '@/components/FilterChips';
import { ProductCard } from '@/components/ProductCard';
import { useHomeFeed, useInfiniteProducts, Product } from '@/api/mobileClient';

export default function HomeScreen() {
  const [activeCategory, setActiveCategory] = useState('men');
  
  const { data: homeFeed, isLoading: isLoadingFeed } = useHomeFeed(activeCategory);
  
  const { 
    data: productsData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading: isLoadingProducts 
  } = useInfiniteProducts(activeCategory);

  const products = productsData?.pages.flatMap(page => page.data) || [];

  const handleAddToCart = (product: Product) => {
    // Add to cart logic
    console.log('Add to cart', product.id);
  };

  const renderHeader = () => (
    <View>
      <PromoBanner banners={homeFeed?.banners || []} />
      <FilterChips />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <Header />
      <CategoryTabs 
        activeCategory={activeCategory} 
        onSelect={setActiveCategory} 
      />
      
      {isLoadingFeed || isLoadingProducts ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#121212" />
        </View>
      ) : (
        <View className="flex-1 bg-gray-50">
          <FlashList
            data={products}
            renderItem={({ item }) => (
              <ProductCard 
                product={item} 
                onPress={() => console.log('Press', item.id)}
                onAddToCart={() => handleAddToCart(item)}
              />
            )}
            numColumns={2}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={{ padding: 4 }}
            onEndReached={() => {
              if (hasNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => (
              isFetchingNextPage ? (
                <View className="py-4 justify-center items-center">
                  <ActivityIndicator color="#121212" />
                </View>
              ) : null
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
