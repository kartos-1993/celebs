import { useCallback, useMemo, useState } from 'react';

import type { QuickFilterItem } from '../types';

import type { ProductFilterParams } from '@/features/products/types';

export function useCategoryFilters(categorySlug: string) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuickFilterValue, setSelectedQuickFilterValue] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedFits, setSelectedFits] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max: number } | null>(
    null,
  );
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const handleSelectQuickFilterItem = useCallback((item: QuickFilterItem) => {
    const val = item.filterValue || item.slug || item.name;
    setSelectedQuickFilterValue((prev) => (prev === val ? null : val));
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
    setSelectedQuickFilterValue(null);
  }, []);

  const filterParams: ProductFilterParams = useMemo(
    () => ({
      limit: 20,
      category: categorySlug,
      search: searchQuery.trim() || undefined,
      minPrice: selectedPriceRange?.min,
      maxPrice: selectedPriceRange?.max,
      tag: selectedQuickFilterValue || undefined,
    }),
    [categorySlug, searchQuery, selectedPriceRange, selectedQuickFilterValue],
  );

  const activeFilterCount =
    selectedColors.length +
    selectedSizes.length +
    selectedFits.length +
    (selectedPriceRange ? 1 : 0) +
    (selectedQuickFilterValue ? 1 : 0);

  return {
    searchQuery,
    setSearchQuery,
    selectedQuickFilterValue,
    handleSelectQuickFilterItem,
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
