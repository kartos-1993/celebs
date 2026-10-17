import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import type { DropdownCategory } from '@celebs/shared-types';

import { checkProductFormHasData } from '../utils/add-product-helpers';

interface UseBasicInfoSectionOptions {
  selectedSubcategoryId: string;
  categoryPath?: string[];
}

export function useBasicInfoSection({
  selectedSubcategoryId,
  categoryPath,
}: UseBasicInfoSectionOptions) {
  const [selectedCategory, setSelectedCategory] = useState<DropdownCategory | null>(null);
  const { setValue, getValues } = useFormContext();

  const checkHasData = useCallback(
    () => checkProductFormHasData(getValues() as Record<string, unknown>),
    [getValues],
  );

  useEffect(() => {
    if (categoryPath?.length && selectedSubcategoryId) {
      setSelectedCategory({
        id: selectedSubcategoryId,
        name: categoryPath[categoryPath.length - 1] || 'Selected',
        parentCategory: null,
        hasChildren: false,
        level: Math.max(0, categoryPath.length - 1),
        path: categoryPath,
      });
    } else if (!selectedSubcategoryId || !categoryPath?.length) {
      setSelectedCategory(null);
    }
  }, [categoryPath, selectedSubcategoryId]);

  const hasCategory = useMemo(
    () => Boolean(selectedCategory || selectedSubcategoryId),
    [selectedCategory, selectedSubcategoryId],
  );

  const handleBrandSelect = useCallback(
    (brandName: string) => {
      setValue('brand', brandName, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const categoryPathDisplay = useMemo(() => {
    const p = selectedCategory?.path || categoryPath;
    if (!p) return '';
    if (Array.isArray(p)) return p.join(' > ');
    if (typeof p === 'string') return p.split('/').join(' > ');
    return String(p);
  }, [selectedCategory?.path, categoryPath]);

  return {
    selectedCategory,
    setSelectedCategory,
    checkHasData,
    hasCategory,
    handleBrandSelect,
    categoryPathDisplay,
  };
}
