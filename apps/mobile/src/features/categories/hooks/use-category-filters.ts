import { useCallback, useMemo, useState } from 'react';

import type { StorefrontShortcutType } from '@celebs/shared-types';

import type { StorefrontShortcutItem } from '../types';

import type { ProductFilterParams } from '@/features/products/types';

export interface SelectedStorefrontShortcut {
  type: StorefrontShortcutType;
  value: string;
}

/**
 * Maps a selected storefront-shortcut chip to the list filter param it drives.
 * Subcategory chips filter by subtree slug; campaign chips by campaign slug.
 * Chip types without a list-filter axis contribute nothing — a chip must never
 * be silently mapped onto the wrong filter axis.
 */
export function shortcutFilterParams(
  selection: SelectedStorefrontShortcut | null,
): Pick<ProductFilterParams, 'subcategory' | 'campaign'> {
  if (!selection) return {};

  if (selection.type === 'subcategory') return { subcategory: selection.value };
  if (selection.type === 'campaign') return { campaign: selection.value };

  return {};
}

export function useCategoryFilters(categorySlug: string) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStorefrontShortcut, setSelectedStorefrontShortcut] =
    useState<SelectedStorefrontShortcut | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedFits, setSelectedFits] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max: number } | null>(
    null,
  );
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const handleSelectStorefrontShortcutItem = useCallback(
    (item: StorefrontShortcutItem, shortcutType: StorefrontShortcutType) => {
      const value = item.filterValue || item.slug || item.name;
      setSelectedStorefrontShortcut((prev) =>
        prev?.value === value ? null : { type: shortcutType, value },
      );
    },
    [],
  );

  const handleToggleColor = useCallback((colorName: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName],
    );
  }, []);

  const handleToggleSize = useCallback((size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  }, []);

  const handleToggleFit = useCallback((fit: string) => {
    setSelectedFits((prev) =>
      prev.includes(fit) ? prev.filter((f) => f !== fit) : [...prev, fit],
    );
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedFits([]);
    setSelectedPriceRange(null);
    setSelectedStorefrontShortcut(null);
  }, []);

  const filterParams: ProductFilterParams = useMemo(
    () => ({
      limit: 20,
      category: categorySlug,
      search: searchQuery.trim() || undefined,
      minPrice: selectedPriceRange?.min,
      maxPrice: selectedPriceRange?.max,
      sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
      colors: selectedColors.length > 0 ? selectedColors : undefined,
      fits: selectedFits.length > 0 ? selectedFits : undefined,
      ...shortcutFilterParams(selectedStorefrontShortcut),
    }),
    [
      categorySlug,
      searchQuery,
      selectedPriceRange,
      selectedSizes,
      selectedColors,
      selectedFits,
      selectedStorefrontShortcut,
    ],
  );

  const selectedStorefrontShortcutValue = selectedStorefrontShortcut?.value ?? null;

  const activeFilterCount =
    selectedColors.length +
    selectedSizes.length +
    selectedFits.length +
    (selectedPriceRange ? 1 : 0) +
    (selectedStorefrontShortcut ? 1 : 0);

  return {
    searchQuery,
    setSearchQuery,
    selectedStorefrontShortcutValue,
    handleSelectStorefrontShortcutItem,
    selectedColors,
    handleToggleColor,
    selectedSizes,
    handleToggleSize,
    selectedFits,
    handleToggleFit,
    selectedPriceRange,
    setSelectedPriceRange,
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
    handleResetFilters,
    filterParams,
    activeFilterCount,
  };
}
