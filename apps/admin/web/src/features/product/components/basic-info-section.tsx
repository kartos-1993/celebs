import { useEffect, useMemo, useState } from 'react';
import { Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
// Icons intentionally not used now; keep minimal imports
import { CascadingDropdown, Category as DropdownCategory } from './cascading-dropdown';


interface BasicInfoSectionProps {
  control: Control<any>;
  selectedCategoryId: string; // kept for API parity
  selectedSubcategoryId: string; // kept for API parity
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategoryId: string) => void;
  onFieldChange: (name: string, value: string) => void;
  onCategoryPathChange?: (path: string[]) => void;
  categoryPath?: string[]; // for reflecting preselected value in cascader
}

const BasicInfoSection = ({
  control,
  selectedCategoryId: _selectedCategoryId,
  selectedSubcategoryId: _selectedSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  onFieldChange,
  onCategoryPathChange,
  categoryPath,
}: BasicInfoSectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState<DropdownCategory | null>(null);

  // If parent already has a selected category id + path (e.g., editing or deep link), reflect it in the trigger
  useEffect(() => {
    if (!selectedCategory && categoryPath && categoryPath.length && _selectedSubcategoryId) {
      setSelectedCategory({
        id: _selectedSubcategoryId,
        name: categoryPath[categoryPath.length - 1] || 'Selected',
        parentId: null,
        hasChildren: false,
        level: Math.max(0, categoryPath.length - 1),
        path: categoryPath,
      });
    }
  }, [categoryPath, _selectedSubcategoryId, selectedCategory]);

  // Consider either local selection or parent-provided subcategory id as selected state
  const hasCategory = useMemo(() => !!selectedCategory || !!_selectedSubcategoryId, [selectedCategory, _selectedSubcategoryId]);
  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {/* Category selection first with hint */}
        <div className="space-y-2">
          <FormLabel className="required text-gray-900 dark:text-gray-100">
            Category
          </FormLabel>
          <CascadingDropdown
            selectedCategory={selectedCategory ?? undefined}
            onSelect={(cat) => {
              setSelectedCategory(cat);
              onCategoryChange(cat.id);
              onSubcategoryChange(cat.id);
              onCategoryPathChange?.(cat.path);
            }}
            placeholder="Please select category or search with keyword"
          />
          <p className="text-xs text-muted-foreground">
            {hasCategory
              ? (
                <>
                  Current selection: <span className="font-medium text-primary">{(selectedCategory?.path || categoryPath || []).join(' > ')}</span>
                </>
              )
              : 'Select a category to start adding the product. The form will appear after selection.'}
          </p>
        </div>

        {/* Show Product Name only after category is selected, like the referenced flow */}
        {hasCategory && (
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="required text-gray-900 dark:text-gray-100">
                  Product Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter product name"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      onFieldChange('name', e.target.value);
                    }}
                    className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
};

export default BasicInfoSection;
