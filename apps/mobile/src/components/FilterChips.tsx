import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';

const CHIPS = ['All', 'Hot Deals', 'Popular Picks', 'EU/UK Warehouse', 'Trends'];

export const FilterChips = () => {
  const [active, setActive] = React.useState('All');

  return (
    <View className="py-2 bg-gray-50">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {CHIPS.map((chip) => {
          const isActive = active === chip;
          return (
            <Pressable 
              key={chip} 
              onPress={() => setActive(chip)}
              className={`mr-2 px-4 py-1.5 rounded-full border ${isActive ? 'bg-charcoal border-charcoal' : 'bg-white border-gray-200'}`}
            >
              <Text className={`text-sm ${isActive ? 'text-white font-medium' : 'text-charcoal'}`}>
                {chip}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};
