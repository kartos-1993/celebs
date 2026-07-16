import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';

const CATEGORIES = [
  { id: 'men', label: 'Men' },
  { id: 'women', label: 'Women' },
  { id: 'kids', label: 'Kids' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'home', label: 'Home' },
];

interface CategoryTabsProps {
  activeCategory: string;
  onSelect: (id: string) => void;
}

export const CategoryTabs = ({ activeCategory, onSelect }: CategoryTabsProps) => {
  return (
    <View className="bg-white border-b border-gray-100">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {CATEGORIES.map((category) => {
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
