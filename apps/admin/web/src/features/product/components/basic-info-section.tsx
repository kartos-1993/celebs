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

        <FormField
          control={control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="required">Category & Subcategory</FormLabel>
              <FormControl>
                <Popover
                  open={categoryDropdownOpen}
                  onOpenChange={setCategoryDropdownOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="justify-between w-full h-auto py-5 px-4 bg-background text-foreground border-border dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800"
                    >
                      {selectedSubcategoryId ? (
                        <div className="flex items-center">
                          <span>{selectedCategory?.name}</span>
                          <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground dark:text-gray-400" />
                          <span>{selectedSubcategory?.name}</span>
                        </div>
                      ) : selectedCategoryId ? (
                        <span>{selectedCategory?.name}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          Select category...
                        </span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <div className="grid grid-cols-2 divide-x max-h-[300px] overflow-auto">
                      <div className="p-1">
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md ${
                              selectedCategoryId === category.id
                                ? 'bg-accent text-accent-foreground font-medium dark:bg-blue-900/40 dark:text-blue-200'
                                : 'hover:bg-muted dark:hover:bg-gray-800'
                            }`}
                            onClick={() => onCategoryChange(category.id)}
                            type="button"
                          >
                            <span>{category.name}</span>
                            {category.subcategories.length > 0 && (
                              <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                            )}
                          </button>
                        ))}
                      </div>
                      {selectedCategoryId && (
                        <div className="p-1">
                          {selectedCategory?.subcategories.map(
                            (subcategory) => (
                              <button
                                key={subcategory.id}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                                  selectedSubcategoryId === subcategory.id
                                    ? 'bg-accent text-accent-foreground font-medium dark:bg-blue-900/40 dark:text-blue-200'
                                    : 'hover:bg-muted dark:hover:bg-gray-800'
                                }`}
                                onClick={() => {
                                  onSubcategoryChange(subcategory.id);
                                  setCategoryDropdownOpen(false);
                                }}
                                type="button"
                              >
                                {subcategory.name}
                              </button>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {selectedSubcategoryId && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Base Price (रू)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">
                        रू
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          onFieldChange('price', e.target.value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="discountPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Price (रू)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">
                        रू
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          onFieldChange('discountPrice', e.target.value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="required">Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter product description (minimum 20 characters)"
                    rows={5}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      onFieldChange('description', e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
                <div className="text-xs text-muted-foreground dark:text-gray-400">
                  {field.value?.length || 0}/1000 characters
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status"
                    checked={field.value === 'active'}
                    onCheckedChange={(checked) => {
                      const value = checked ? 'active' : 'inactive';
                      field.onChange(value);
                      onFieldChange('status', value);
                    }}
                  />
                  <label
                    htmlFor="status"
                    className="text-sm font-medium text-foreground dark:text-gray-100"
                  >
                    Active (product visible in store)
                  </label>
                </div>
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  );
};

export default BasicInfoSection;
