import { memo } from 'react';
import type { Control, FieldValues } from 'react-hook-form';
import { Lock } from 'lucide-react';

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
import { useBasicInfoSection } from './use-basic-info-section';

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
  isCategoryLocked?: boolean;
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
  isCategoryLocked,
}: BasicInfoSectionProps) => {
  const {
    selectedCategory,
    setSelectedCategory,
    checkHasData,
    hasCategory,
    handleBrandSelect,
    categoryPathDisplay,
  } = useBasicInfoSection({ selectedSubcategoryId, categoryPath });

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
              {isCategoryLocked ? (
                <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{categoryPathDisplay || selectedCategory?.name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Category is locked for live products to maintain warehouse barcodes, tax
                      codes, and order history.
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Locked
                  </span>
                </div>
              ) : (
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
              )}
            </FormControl>
            {!isCategoryLocked && (
              <FormDescription className="text-xs text-muted-foreground">
                Pick the most specific category. The rest of the product form is generated from this
                selection.
              </FormDescription>
            )}
            {!isCategoryLocked && hasCategory && categoryPathDisplay && (
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
