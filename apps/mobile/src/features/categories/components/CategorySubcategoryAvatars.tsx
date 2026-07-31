import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';

export interface SubCategoryAvatar {
  name: string;
  image: string;
}

export const SUBCATEGORY_AVATARS_MAP: Record<string, SubCategoryAvatar[]> = {
  'denim-jeans': [
    { name: 'Long', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&q=80' },
    { name: 'Cropped', image: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=200&q=80' },
    { name: 'Extra Long', image: 'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=200&q=80' },
    { name: 'Capris', image: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=200&q=80' },
    { name: 'Soft', image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=200&q=80' },
  ],
  'shirts': [
    { name: 'Multicolor', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&q=80' },
    { name: 'Black & White', image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=200&q=80' },
    { name: 'Red & White', image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=200&q=80' },
    { name: 'Blue & White', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&q=80' },
    { name: 'Black', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=200&q=80' },
  ],
  't-shirts': [
    { name: 'Multicolor', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&q=80' },
    { name: 'Black & White', image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=200&q=80' },
    { name: 'Red & White', image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=200&q=80' },
    { name: 'Blue & White', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&q=80' },
    { name: 'Black', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=200&q=80' },
  ],
  'denim-jackets': [
    { name: 'Fleece', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&q=80' },
    { name: 'Oversized', image: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=200&q=80' },
    { name: 'Flap Pocket', image: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=200&q=80' },
    { name: 'Distressed', image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=200&q=80' },
    { name: 'Vintage', image: 'https://images.unsplash.com/photo-1525457136159-8878648a7ad0?w=200&q=80' },
  ],
  default: [
    { name: 'All', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&q=80' },
    { name: 'Casual', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&q=80' },
    { name: 'Streetwear', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=200&q=80' },
    { name: 'Classic', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=200&q=80' },
    { name: 'Oversized', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=200&q=80' },
  ],
};

interface CategorySubcategoryAvatarsProps {
  slug: string;
  selectedSubcategory: string | null;
  onSelectSubcategory: (name: string) => void;
}

export const CategorySubcategoryAvatars: React.FC<CategorySubcategoryAvatarsProps> = ({
  slug,
  selectedSubcategory,
  onSelectSubcategory,
}) => {
  const avatars = SUBCATEGORY_AVATARS_MAP[slug] || SUBCATEGORY_AVATARS_MAP.default;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {avatars.map((item, idx) => {
        const isSelected = selectedSubcategory === item.name;
        return (
          <TouchableOpacity
            key={`${item.name}-${idx}`}
            style={styles.avatarItem}
            activeOpacity={0.8}
            onPress={() => onSelectSubcategory(item.name)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${item.name}`}
          >
            <View style={[styles.avatarRing, isSelected && styles.avatarRingSelected]}>
              <Image
                source={{ uri: item.image }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            </View>
            <ThemedText style={[styles.avatarLabel, isSelected && styles.avatarLabelSelected]}>
              {item.name}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  avatarItem: {
    alignItems: 'center',
    width: 64,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRingSelected: {
    borderColor: '#208AEF',
    borderWidth: 2.5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  avatarLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  avatarLabelSelected: {
    color: '#208AEF',
    fontWeight: '700',
  },
});
