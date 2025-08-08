import { useState } from 'react';
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
}

const BasicInfoSection = ({
  control,
  selectedCategoryId,
  selectedSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  onFieldChange,
}: BasicInfoSectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState<DropdownCategory | null>(null);

  return (
    <div className="space-y-6">
  <div className="grid gap-6">
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
        {/* Category selection */}
        <div className="space-y-2">
          <FormLabel className="required text-gray-900 dark:text-gray-100">
            Category
          </FormLabel>
          <CascadingDropdown
            selectedCategory={selectedCategory ?? undefined}
            onSelect={(cat) => {
              setSelectedCategory(cat);
              // Treat the selected leaf as the subcategory for this form
              onCategoryChange(cat.id);
              onSubcategoryChange(cat.id);
            }}
            placeholder="Please select category or search with keyword"
          />
          {selectedCategory && (
            <p className="text-xs text-muted-foreground">
              Current selection: <span className="font-medium text-orange-600">{selectedCategory.path.join(' > ')}</span>
            </p>
          )}
        </div>
      </div>

     
    </div>
  );
};

export default BasicInfoSection;
