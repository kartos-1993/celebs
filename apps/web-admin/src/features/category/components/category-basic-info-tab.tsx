import React, { ChangeEvent, KeyboardEvent } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
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
import { X, Plus, Upload, Loader } from 'lucide-react';
import { Category } from '../types';
import { CategoryFormData } from '../schemas/category-form-schema';

export interface CategoryBasicInfoTabProps {
  form: UseFormReturn<CategoryFormData>;
  categories: Category[];
  initialDataId?: string;
  role?: string;
  isUploadingImage: boolean;
  newColumnInput: string;
  setNewColumnInput: (val: string) => void;
  handleAddSizeColumn: () => void;
  handleRemoveSizeColumn: (colToRemove: string) => void;
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
  handleAddSizeColumn,
  handleRemoveSizeColumn,
  handleImageUpload,
}) => {
  const availableParents = categories.filter(
    (cat) =>
      cat._id !== initialDataId && !cat.path?.includes(initialDataId || '')
  );

  const imageUrl = form.watch('imageUrl');
  const sizeChartColumns = form.watch('sizeChartColumns') || [];

  return (
    <div className="space-y-4 pt-2">
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
                  <SelectItem key={category._id} value={category._id}>
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

      {/* Size Chart Columns Setup */}
      <div className="space-y-3 border-t pt-4">
        <Label className="text-base font-semibold">Size Chart Columns (Size Guide)</Label>
        <p className="text-xs text-gray-500">
          Define measurement fields required for products in this category (e.g., Bust, Shoulder, Waist Size, Length).
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Add column header (e.g. Waist Size)"
            value={newColumnInput}
            onChange={(e) => setNewColumnInput(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSizeColumn();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={handleAddSizeColumn}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {sizeChartColumns.map((col) => (
            <Badge key={col} variant="secondary" className="flex items-center gap-1 py-1 px-3">
              <span>{col}</span>
              <X
                className="h-3 w-3 cursor-pointer text-gray-500 hover:text-red-500"
                onClick={() => handleRemoveSizeColumn(col)}
              />
            </Badge>
          ))}
          {sizeChartColumns.length === 0 && (
            <span className="text-xs text-gray-400 italic">No size chart measurement columns added yet.</span>
          )}
        </div>
      </div>

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
