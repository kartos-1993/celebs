import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import { QuickFilterItem } from '../../types';

import { styles } from './avatar-scroll-filter.styles';

import { MobileApparelImage } from '@/components/mobile-apparel-image';
import { ThemedText } from '@/components/themed-text';

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
              {/* No Unsplash stand-in: a filter with no artwork gets a neutral
                  avatar tile, never a third-party photo hotlinked in production. */}
              <MobileApparelImage
                src={item.image}
                preset="avatar"
                containerStyle={styles.avatarImage}
                contentFit="cover"
                alt={item.name}
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
