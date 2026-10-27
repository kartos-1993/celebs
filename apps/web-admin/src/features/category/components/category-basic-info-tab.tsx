import React, { type ChangeEvent } from 'react';
import { type UseFormReturn } from 'react-hook-form';

import type { CreateCategoryType as CategoryFormData } from '@celebs/shared-types';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';
import { Input } from '@celebs/shared-ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';

import { Category } from '../types';

import { CategoryImageField } from './category-image-field';

export interface CategoryBasicInfoTabProps {
  form: UseFormReturn<CategoryFormData>;
  categories: Category[];
  initialDataId?: string;
  isUploadingImage: boolean;
  handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const CategoryBasicInfoTab: React.FC<CategoryBasicInfoTabProps> = ({
  form,
  categories,
  initialDataId,
  isUploadingImage,
  handleImageUpload,
}) => {
  const editingCategory = categories.find((c) => c.id === initialDataId);
  const editingSlug = editingCategory?.slug;

  const availableParents = categories.filter((cat) => {
    if (cat.id === initialDataId) return false;
    if (cat.parentCategory === initialDataId) return false;
    if (editingSlug && cat.path) {
      const pathParts = Array.isArray(cat.path)
        ? (cat.path as string[])
        : String(cat.path).split('/');
      if (pathParts.includes(editingSlug)) return false;
    }
    return true;
  });

  const imageUrl = form.watch('imageUrl');

  return (
    <div className="space-y-5 pt-2">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter category name (e.g. Men Denim Jackets)" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="parentCategory"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Parent Category (Optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || 'ROOT_CATEGORY'}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category (leave empty for root category)" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="ROOT_CATEGORY">No Parent (Root Category)</SelectItem>
                {availableParents.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {'  '.repeat(category.level - 1)}
                    {category.name} (Level {category.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <CategoryImageField
        imageUrl={imageUrl}
        isUploading={isUploadingImage}
        onClear={() => form.setValue('imageUrl', null, { shouldDirty: true })}
        onUpload={handleImageUpload}
      />

      <div className="space-y-4 border-t pt-4">
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-0.5">
                <FormLabel>Active Status</FormLabel>
                <div className="text-xs text-muted-foreground">
                  Enable or disable category visibility across storefront catalog
                </div>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default CategoryBasicInfoTab;
