import React, { ChangeEvent } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Upload,X } from 'lucide-react';

import type { CreateCategoryType as CategoryFormData } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
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
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { Category } from '../types';

export interface CategoryBasicInfoTabProps {
  form: UseFormReturn<CategoryFormData>;
  categories: Category[];
  initialDataId?: string;
  role?: string;
  isUploadingImage: boolean;
  handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const CategoryBasicInfoTab: React.FC<CategoryBasicInfoTabProps> = ({
  form,
  categories,
  initialDataId,
  role,
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

      {role === 'SUPERADMIN' && (
        <div className="space-y-2 border-t pt-4">
          <FormLabel>Category Image (Superadmin Only)</FormLabel>
          <div className="flex items-center space-x-4">
            {imageUrl ? (
              <div className="relative w-16 h-16 rounded-md border overflow-hidden group">
                <img src={imageUrl} alt="Category image" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  onClick={() => form.setValue('imageUrl', null, { shouldDirty: true })}
                  className="absolute inset-0 bg-black bg-opacity-50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="w-16 h-16 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                {isUploadingImage ? (
                  <Spinner size="sm" className="text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploadingImage}
                  onChange={handleImageUpload}
                />
              </label>
            )}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Category thumbnail image for storefront navigation.</p>
              <p>Upload square image (JPEG, PNG, WebP, AVIF) up to 5MB.</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Status */}
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
