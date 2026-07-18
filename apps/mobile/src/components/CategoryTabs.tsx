import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';

interface CategoryTabsProps {
  categories: { id: string; label: string }[];
  activeCategory: string;
  onSelect: (id: string) => void;
}

export const CategoryTabs = ({ categories, activeCategory, onSelect }: CategoryTabsProps) => {
  return (
    <View className="bg-white border-b border-gray-100">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <Pressable 
              key={category.id} 
              onPress={() => onSelect(category.id)}
              className="mr-6 py-3"
            >
              <Text className={`text-base ${isActive ? 'font-bold text-charcoal' : 'text-gray-500'}`}>
                {category.label}
              </Text>
              {isActive && (
                <View className="absolute bottom-0 left-0 right-0 h-1 bg-charcoal rounded-t-md" />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};
