import React, { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import { CartItemHydrated } from '@celebs/shared-types';

import { useCart } from '../context/cart-context';
import { groupItemsByBrand } from '../utils/cart-selectors';

import { CartFilterChips, CartListFilter } from './cart-filter-chips';
import { styles } from './cart-items-section.styles';
import { QuantityPickerSheet } from './quantity-picker-sheet';
import { ShopCartGroup } from './shop-cart-group';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface CartItemsSectionProps {
  updatingId: string | null;
  onUpdateQuantity: (itemId: string, quantity: number) => void | Promise<void>;
  onRemoveItem: (itemId: string) => void | Promise<void>;
  contentPaddingBottom?: number;
}

export function CartItemsSection({
  updatingId,
  onUpdateQuantity,
  onRemoveItem,
  contentPaddingBottom = Spacing.md,
}: CartItemsSectionProps) {
  const { cart, selectedItemIds, toggleItemSelection, setItemsSelection } = useCart();

  const [filter, setFilter] = useState<CartListFilter>('all');
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [qtyPickerItem, setQtyPickerItem] = useState<CartItemHydrated | null>(null);

  const items = useMemo(() => cart?.items || [], [cart]);
  const brands = useMemo(
    () =>
      [
        ...new Set(
          items.map((item) => item.productBrand?.trim() || 'Other'),
        ),
      ].sort(),
    [items],
  );

  const visibleItems = useMemo(() => {
    let result = items;
    if (filter === 'selected') {
      result = result.filter((item) => selectedItemIds.includes(item.id));
    }
    if (filter === 'brand' && activeBrand) {
      result = result.filter((item) => (item.productBrand?.trim() || 'Other') === activeBrand);
    }
    return result;
  }, [items, filter, selectedItemIds, activeBrand]);

  const groups = useMemo(() => groupItemsByBrand(visibleItems), [visibleItems]);

  const handleFilterChange = (next: CartListFilter) => {
    setFilter(next);
    if (next === 'brand') {
      setBrandMenuOpen((open) => !open);
    } else {
      setBrandMenuOpen(false);
      setActiveBrand(null);
    }
  };

  const handleBrandSelect = (brand: string | null) => {
    setActiveBrand(brand);
    setBrandMenuOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.chipsArea}>
        <View style={styles.chipsRow}>
          <CartFilterChips value={filter} brandLabel={activeBrand} onChange={handleFilterChange} />
        </View>

        {brandMenuOpen ? (
          <View style={styles.brandMenu}>
            <BrandMenuRow
              label="All Brands"
              selected={activeBrand === null}
              onPress={() => handleBrandSelect(null)}
            />
            {brands.map((brand) => (
              <BrandMenuRow
                key={brand}
                label={brand}
                selected={activeBrand === brand}
                onPress={() => handleBrandSelect(brand)}
              />
            ))}
          </View>
        ) : null}
      </View>

      {visibleItems.length === 0 ? (
        <View style={styles.emptyFilterBox}>
          <ThemedText style={styles.emptyFilterText}>
            {filter === 'selected'
              ? 'No items selected yet.'
              : 'No items found for this brand.'}
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: contentPaddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          {groups.map((group) => (
            <ShopCartGroup
              key={group.brand}
              brand={group.brand}
              items={group.items}
              selectedItemIds={selectedItemIds}
              updatingId={updatingId}
              onToggleItem={toggleItemSelection}
              onToggleShop={setItemsSelection}
              onQuantityPress={setQtyPickerItem}
              onRemoveItem={onRemoveItem}
            />
          ))}
        </ScrollView>
      )}

      <QuantityPickerSheet
        item={qtyPickerItem}
        visible={qtyPickerItem !== null}
        onClose={() => setQtyPickerItem(null)}
        onSelect={(quantity) => {
          const itemId = qtyPickerItem?.id;
          setQtyPickerItem(null);
          if (itemId) onUpdateQuantity(itemId, quantity);
        }}
      />
    </View>
  );
}

interface BrandMenuRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const BrandMenuRow: React.FC<BrandMenuRowProps> = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={styles.brandMenuRow}
    onPress={onPress}
    activeOpacity={0.7}
    accessible={true}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={`Filter by ${label}`}
  >
    <ThemedText
      style={[styles.brandMenuText, selected && styles.brandMenuTextSelected]}
      numberOfLines={1}
    >
      {label}
    </ThemedText>
    {selected ? <View style={styles.brandMenuDot} /> : null}
  </TouchableOpacity>
);
