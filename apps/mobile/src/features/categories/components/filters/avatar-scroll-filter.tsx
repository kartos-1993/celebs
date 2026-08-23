import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

import { QuickFilterItem } from '../../types';

import { styles } from './avatar-scroll-filter.styles';

import { ThemedText } from '@/components/themed-text';
import { resolveImageUrl } from '@/constants/config';

interface AvatarScrollFilterProps {
  items: QuickFilterItem[];
  selectedItem: string | null;
  onSelectItem: (item: QuickFilterItem) => void;
}

export const AvatarScrollFilter: React.FC<AvatarScrollFilterProps> = ({
  items,
  selectedItem,
  onSelectItem,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {items.map((item, idx) => {
        const itemKey = item.filterValue || item.slug || item.name;
        const isSelected = selectedItem === itemKey || (selectedItem === 'All' && idx === 0);
        const imageUrl =
          resolveImageUrl(item.image) ||
          'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&q=80';

        return (
          <TouchableOpacity
            key={`${item.name}-${idx}`}
            style={styles.avatarItem}
            activeOpacity={0.8}
            onPress={() => onSelectItem(item)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${item.name}`}
          >
            <View style={[styles.avatarRing, isSelected && styles.avatarRingSelected]}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            </View>
            <ThemedText
              style={[styles.avatarLabel, isSelected && styles.avatarLabelSelected]}
              numberOfLines={1}
            >
              {item.name}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

