import React, { ChangeEvent, KeyboardEvent } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Badge } from '@celebs/shared-ui/components/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';
import { X, Plus, Upload, Loader, Shirt, UserCheck } from 'lucide-react';
import { Category } from '../types';
import type { CreateCategoryType as CategoryFormData } from '@celebs/shared-types';

export interface CategoryBasicInfoTabProps {
  form: UseFormReturn<CategoryFormData>;
  categories: Category[];
  initialDataId?: string;
  role?: string;
  isUploadingImage: boolean;
  newColumnInput: string;
  setNewColumnInput: (val: string) => void;
  newBodyColumnInput?: string;
  setNewBodyColumnInput?: (val: string) => void;
  handleAddSizeColumn: () => void;
  handleRemoveSizeColumn: (colToRemove: string) => void;
  handleAddBodyColumn?: () => void;
  handleRemoveBodyColumn?: (colToRemove: string) => void;
  handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const CategoryBasicInfoTab: React.FC<CategoryBasicInfoTabProps> = ({
  form,
  categories,
  initialDataId,
  role,
  isUploadingImage,
  newColumnInput,
  setNewColumnInput,
  newBodyColumnInput = '',
  setNewBodyColumnInput,
  handleAddSizeColumn,
  handleRemoveSizeColumn,
  handleAddBodyColumn,
  handleRemoveBodyColumn,
  handleImageUpload,
}) => {
  const editingCategory = categories.find((c) => c.id === initialDataId);
  const editingSlug = editingCategory?.slug;

  const availableParents = categories.filter((cat) => {
    if (cat.id === initialDataId) return false;
    if (cat.parent === initialDataId || (cat as any).parentCategory === initialDataId) return false;
    if (editingSlug && cat.path) {
      const pathParts = Array.isArray(cat.path)
        ? (cat.path as string[])
        : String(cat.path).split('/');
      if (pathParts.includes(editingSlug)) return false;
    }
    return true;
  });

  const imageUrl = form.watch('imageUrl');
  const sizeChartColumns = form.watch('sizeChartColumns') || [];
  const bodyChartColumns = form.watch('bodyChartColumns') || [];

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
        name="parent"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Parent Category (Optional)</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || 'ROOT_CATEGORY'}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category (leave empty for root category)" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="ROOT_CATEGORY">
                  No Parent (Root Category)
                </SelectItem>
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

      {/* Product Measurement Columns (Garment Flat) */}
      <div className="space-y-2.5 border-t pt-4">
        <div className="flex items-center gap-2">
          <Shirt className="h-4 w-4 text-indigo-600" />
          <FormLabel className="text-sm font-semibold">
            Product Size Chart Columns (Garment Flat Dimensions)
          </FormLabel>
        </div>
        <p className="text-xs text-muted-foreground">
          Define physical flat garment measurement headers (e.g., Shoulder, Bust, Length, Sleeve Length).
        </p>

        <div className="flex items-center gap-2">
          <Input
            value={newColumnInput}
            onChange={(e) => setNewColumnInput(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSizeColumn();
              }
            }}
            placeholder="Add product column (e.g., Bicep Length)"
            className="h-9 text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSizeColumn}
            className="h-9 shrink-0 gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {sizeChartColumns.map((col) => (
            <Badge
              key={col}
              variant="secondary"
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              {col}
              <button
                type="button"
                onClick={() => handleRemoveSizeColumn(col)}
                className="hover:text-rose-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {sizeChartColumns.length === 0 && (
            <span className="text-xs text-muted-foreground italic">No product columns defined.</span>
          )}
        </div>
      </div>

      {/* Body Measurement Columns (Wearer Fit Guide) */}
      <div className="space-y-2.5 border-t pt-4">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-purple-600" />
          <FormLabel className="text-sm font-semibold">
            Body Size Chart Columns (Wearer Recommended Dimensions)
          </FormLabel>
        </div>
        <p className="text-xs text-muted-foreground">
          Define recommended human body measurement headers (e.g., Height, Bust, Waist Size, Hip Size).
        </p>

        <div className="flex items-center gap-2">
          <Input
            value={newBodyColumnInput}
            onChange={(e) => setNewBodyColumnInput?.(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddBodyColumn?.();
              }
            }}
            placeholder="Add body column (e.g., Thigh Size)"
            className="h-9 text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddBodyColumn}
            className="h-9 shrink-0 gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {bodyChartColumns.map((col) => (
            <Badge
              key={col}
              variant="secondary"
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
            >
              {col}
              <button
                type="button"
                onClick={() => handleRemoveBodyColumn?.(col)}
                className="hover:text-rose-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {bodyChartColumns.length === 0 && (
            <span className="text-xs text-muted-foreground italic">No body columns defined.</span>
          )}
        </div>
      </div>

      {role === 'SUPERADMIN' && (
        <div className="space-y-2 border-t pt-4">
          <FormLabel className="text-base font-semibold">
            Category Image (Superadmin Only)
          </FormLabel>
          <div className="flex items-center space-x-4">
            {imageUrl ? (
              <div className="relative w-16 h-16 rounded-md border overflow-hidden group">
                <img
                  src={imageUrl}
                  alt="Category image"
                  className="w-full h-full object-cover"
                />
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
              <label className="w-16 h-16 rounded-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-fashion-500 transition-colors">
                {isUploadingImage ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="text-[10px] text-gray-500 mt-1">Upload</span>
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
            <div className="text-xs text-gray-500 space-y-1">
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
                <div className="text-xs text-gray-500">
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
