import { useCallback, useMemo, useState } from 'react';

import type { StorefrontShortcutItem } from '../types';

import type { ProductFilterParams } from '@/features/products/types';

export function useCategoryFilters(categorySlug: string) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStorefrontShortcutValue, setSelectedStorefrontShortcutValue] = useState<
    string | null
  >(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedFits, setSelectedFits] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max: number } | null>(
    null,
  );
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const handleSelectStorefrontShortcutItem = useCallback((item: StorefrontShortcutItem) => {
    const val = item.filterValue || item.slug || item.name;
    setSelectedStorefrontShortcutValue((prev) => (prev === val ? null : val));
  }, []);

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
    setSelectedStorefrontShortcutValue(null);
  }, []);

  const filterParams: ProductFilterParams = useMemo(
    () => ({
      limit: 20,
      category: categorySlug,
      search: searchQuery.trim() || undefined,
      minPrice: selectedPriceRange?.min,
      maxPrice: selectedPriceRange?.max,
      tag: selectedStorefrontShortcutValue || undefined,
    }),
    [categorySlug, searchQuery, selectedPriceRange, selectedStorefrontShortcutValue],
  );

  const activeFilterCount =
    selectedColors.length +
    selectedSizes.length +
    selectedFits.length +
    (selectedPriceRange ? 1 : 0) +
    (selectedStorefrontShortcutValue ? 1 : 0);

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
