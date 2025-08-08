import { useState } from 'react';
import { Control } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Category } from '../types/product';
import { CascadingDropdown } from './cascading-dropdown';
import Index from './index';


interface BasicInfoSectionProps {
  control: Control<any>;
  categories: Category[];
  selectedCategoryId: string;
  selectedSubcategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategoryId: string) => void;
  onFieldChange: (name: string, value: string) => void;
}

const BasicInfoSection = ({
  control,
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  onFieldChange,
}: BasicInfoSectionProps) => {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const selectedCategory = categories.find(
    (cat) => cat.id === selectedCategoryId,
  );
  const selectedSubcategory = selectedCategory?.subcategories.find(
    (sub) => sub.id === selectedSubcategoryId,
  );

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

      
        <Index/>
      </div>

     
    </div>
  );
};

export default BasicInfoSection;
