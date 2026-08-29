import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Search, ShoppingCart } from 'lucide-react-native';

import { Palette, Spacing } from '@/constants/theme';
import { useCartSheet } from '@/features/cart/context/cart-sheet-context';
import { styles } from '@/features/categories/styles/category.styles';

interface CategorySearchHeaderProps {
  categoryTitle: string;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onBack: () => void;
}

export const CategorySearchHeader: React.FC<CategorySearchHeaderProps> = ({
  categoryTitle,
  searchQuery,
  onSearchChange,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const { openCartSheet } = useCartSheet();

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.headerBtn}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={24} color={Palette.gray900} />
      </TouchableOpacity>

      <View style={styles.searchBar}>
        <Search size={16} color={Palette.gray400} />
        <TextInput
          placeholder={`Search in ${categoryTitle}...`}
          placeholderTextColor={Palette.gray400}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>

      <TouchableOpacity
        onPress={openCartSheet}
        style={styles.headerBtn}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="View Cart"
      >
        <ShoppingCart size={22} color={Palette.gray900} />
      </TouchableOpacity>
    </View>
  );
};
