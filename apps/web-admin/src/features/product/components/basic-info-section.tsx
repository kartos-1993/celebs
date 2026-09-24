import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { type Control, type FieldValues, useFormContext } from 'react-hook-form';

import type { DropdownCategory } from '@celebs/shared-types';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';

import { BasicInfoInputs } from './basic-info-inputs';
import { CascadingDropdown } from './cascading-dropdown';

interface BasicInfoSectionProps {
  control: Control<FieldValues>;
  selectedCategoryId: string;
  selectedSubcategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategoryId: string) => void;
  onFieldChange: (name: 'name' | 'brand' | 'description', value: string) => void;
  onCategoryPathChange?: (path: string[]) => void;
  categoryPath?: string[];
  hideName?: boolean;
  hideBrand?: boolean;
}

const BasicInfoSection = ({
  control,
  selectedCategoryId: _selectedCategoryId,
  selectedSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  onFieldChange,
  onCategoryPathChange,
  categoryPath,
  hideName,
  hideBrand,
}: BasicInfoSectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState<DropdownCategory | null>(null);
  const { setValue, getValues } = useFormContext();

  const checkHasData = useCallback(() => {
    const v = getValues() as Record<string, unknown>;
    if (!v) return false;
    const hasTxt = (s: unknown) => typeof s === 'string' && s.trim().length > 0;
    const hasArr = (a: unknown) => Array.isArray(a) && a.length > 0;
    const hasObj = (o: unknown) => o !== null && typeof o === 'object' && Object.keys(o).length > 0;
    return Boolean(
      hasTxt(v.name) ||
        hasTxt(v.brand) ||
        hasTxt(v.description) ||
        hasArr(v.mainImage) ||
        hasArr(v.mainImages) ||
        hasArr(v.variants) ||
        (v.price !== undefined && v.price !== '' && v.price !== null) ||
        hasObj(v.sku) ||
        hasObj(v.attributes),
    );
  }, [getValues]);

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

  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="subcategoryId"
        rules={{ required: 'Please select a product category' }}
        render={() => (
          <FormItem className="space-y-3">
            <FormLabel>
              Category <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <CascadingDropdown
                selectedCategory={selectedCategory ?? undefined}
                isDirty={checkHasData}
                onSelect={(category) => {
                  setSelectedCategory(category);
                  onCategoryChange(category.id);
                  onSubcategoryChange(category.id);
                  const pathArr = Array.isArray(category.path)
                    ? category.path
                    : category.path
                      ? [category.path]
                      : [];
                  onCategoryPathChange?.(pathArr);
                }}
                placeholder="Please select category or search with keyword"
              />
            </FormControl>
            <FormDescription className="text-xs text-muted-foreground">
              Pick the most specific category. The rest of the product form is generated from this
              selection.
            </FormDescription>
            {hasCategory && categoryPathDisplay && (
              <div className="rounded-2xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
                Current selection: <span className="font-semibold">{categoryPathDisplay}</span>
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {hasCategory && (
        <BasicInfoInputs
          control={control}
          hideName={hideName}
          hideBrand={hideBrand}
          onFieldChange={onFieldChange}
          onBrandSelect={handleBrandSelect}
        />
      )}
    </div>
  );
};

export default memo(BasicInfoSection);
