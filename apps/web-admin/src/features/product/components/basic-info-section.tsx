import { memo, useEffect, useMemo, useState } from 'react';
import { Control, FieldValues, useFormState } from 'react-hook-form';
import { Input } from '@celebs/shared-ui/components/input';
import { Textarea } from '@celebs/shared-ui/components/textarea';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';
import { CascadingDropdown } from './cascading-dropdown';
import { BrandSelector } from './brand-selector';
import type { DropdownCategory } from '../types';
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
  const { isDirty } = useFormState({ control });

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
    () => !!selectedCategory || !!selectedSubcategoryId,
    [selectedCategory, selectedSubcategoryId],
  );

  const formValues = control._formValues;
  const isFormDirty =
    isDirty ||
    Boolean(
      formValues?.name ||
      formValues?.brand ||
      formValues?.description ||
      (formValues?.attributes && Object.keys(formValues.attributes).length > 0),
    );

  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="subcategoryId"
        render={() => (
          <FormItem className="space-y-3">
            <FormLabel className="text-sm font-semibold text-foreground">
              Category <span className="text-orange-500">*</span>
            </FormLabel>
            <FormControl>
              <CascadingDropdown
                selectedCategory={selectedCategory ?? undefined}
                isDirty={isFormDirty}
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
            {hasCategory ? (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300">
                Current selection:{' '}
                <span className="font-semibold">
                  {(() => {
                    const p = selectedCategory?.path || categoryPath;
                    if (!p) return '';
                    if (Array.isArray(p)) return p.join(' > ');
                    if (typeof p === 'string') return p.split('/').join(' > ');
                    return String(p);
                  })()}
                </span>
              </div>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />

      {hasCategory ? (
        <div className="grid gap-6">
          {!hideName ? (
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-3">
                    <FormLabel className="text-sm font-semibold text-foreground">
                      Product Name <span className="text-orange-500">*</span>
                    </FormLabel>
                    <span className="text-xs text-muted-foreground">
                      {String(field.value || '').length}/200
                    </span>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="Enter a clear, searchable product title"
                      data-testid="product-name-input"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        onFieldChange('name', event.target.value);
                      }}
                      className="h-11 rounded-2xl border-border bg-card text-foreground"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    Include the key identifier, style, or collection name buyers would search for.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {!hideBrand ? (
            <FormField
              control={control}
              name="brandId"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <BrandSelector
                      value={field.value}
                      onChange={(brandId, brandName) => {
                        field.onChange(brandId);
                        if (control._formValues) {
                          control._formValues.brand = brandName || '';
                        }
                        onFieldChange('brand', brandName || '');
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-3">
                  <FormLabel className="text-sm font-semibold text-foreground">
                    Product Description{' '}
                    <span className="font-normal text-xs text-gray-500">(Optional)</span>
                  </FormLabel>
                  <span className="text-xs text-muted-foreground">
                    {String(field.value || '').length}/4000
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Describe the material, fit, standout features, and customer-facing details."
                    data-testid="product-desc-input"
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      onFieldChange('description', event.target.value);
                    }}
                    className="min-h-36 rounded-3xl border-border bg-card px-4 py-3 text-foreground"
                  />
                </FormControl>
                <FormDescription className="text-xs text-muted-foreground">
                  This description is used for the published product page and should be specific
                  enough for customers to understand the item.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : null}
    </div>
  );
};

export default memo(BasicInfoSection);
