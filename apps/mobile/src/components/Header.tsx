import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { UI } from '@/constants/platform';
// import { Heart, ShoppingBag, Search } from 'expo-symbols';

export const Header = () => {
  return (
    <View 
      className="flex-row items-center px-4 bg-white" 
      style={{ height: UI.headerHeight }}
    >
      <View className="flex-1 bg-gray-100 rounded-full flex-row items-center px-3 h-10 mr-4">
        <Text className="text-gray-400 mr-2">🔍</Text>
        <TextInput 
          placeholder="Search products..." 
          className="flex-1 text-charcoal h-full"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      
      <View className="flex-row items-center space-x-4">
        <Pressable hitSlop={10} className="mr-3">
          <Text className="text-xl">🤍</Text>
        </Pressable>
        <Pressable hitSlop={10}>
          <Text className="text-xl">🛍️</Text>
        </Pressable>
      </View>
    </View>
  );
};
