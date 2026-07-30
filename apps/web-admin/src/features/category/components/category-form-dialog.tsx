/**
 * Category form dialog wrapper component
 * Fetches fresh category details by ID when editing to guarantee latest database state.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Loader2 } from 'lucide-react';
import CategoryForm from './category-form';
import { Category } from '../types';
import type { CreateCategoryType as CategoryFormData } from '@celebs/shared-types';
import { useCategory } from '../hooks/use-categories';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory: Category | null;
  parentCategoryId: string | null;
  categories: Category[];
  onSave: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
}

export const CategoryFormDialog: React.FC<CategoryFormDialogProps> = ({
  open,
  onOpenChange,
  editingCategory,
  parentCategoryId,
  categories,
  onSave,
  onCancel,
}) => {
  const editingId = editingCategory?._id || '';

  // Fetch fresh category detail directly from server database when editing
  const { data: categoryDetailRes, isLoading: isLoadingDetail } = useCategory(editingId);

  const freshCategoryData = categoryDetailRes?.data || editingCategory;

  const getDialogTitle = () => {
    if (editingCategory) return 'Edit Category';
    if (parentCategoryId) return 'Add Subcategory';
    return 'Add Category';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        aria-describedby="dialog-description"
      >
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        <div id="dialog-description" className="sr-only">
          {editingCategory
            ? 'Edit the details of the selected category.'
            : parentCategoryId
            ? 'Add a subcategory under the selected parent category.'
            : 'Add a new category to the list.'}
        </div>

        {editingId && isLoadingDetail ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium">Fetching fresh category specifications...</span>
          </div>
        ) : (
          <CategoryForm
            key={freshCategoryData?._id || parentCategoryId || 'new-category'}
            initialData={
              freshCategoryData ||
              (parentCategoryId ? { parent: parentCategoryId } : undefined)
            }
            categories={categories}
            onSave={onSave}
            onCancel={onCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CategoryFormDialog;
