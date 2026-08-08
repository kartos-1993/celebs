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
  isLoading?: boolean;
}

function formatCategoryPath(path: unknown): string {
  if (Array.isArray(path)) return path.join(' > ');
  if (typeof path === 'string') return path.split('/').join(' > ');
  return String(path || '');
}

export const CategoryFormDialog: React.FC<CategoryFormDialogProps> = ({
  open,
  onOpenChange,
  editingCategory,
  parentCategoryId,
  categories,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const editingId = editingCategory?.id || '';

  // Fetch fresh category detail directly from server database when editing
  const { data: categoryDetailRes, isLoading: isLoadingDetail } = useCategory(editingId);

  const freshCategoryData = categoryDetailRes?.data || editingCategory;

  const parentCategory = parentCategoryId
    ? categories.find((c) => c.id === parentCategoryId)
    : null;

  const activeCategoryName = freshCategoryData?.name || editingCategory?.name;

  const getDialogTitle = () => {
    if (editingCategory) return `Edit Category: ${activeCategoryName || ''}`;
    if (parentCategory) return `Add Subcategory under "${parentCategory.name}"`;
    return 'Add New Category';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        aria-describedby="dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900">
            {getDialogTitle()}
          </DialogTitle>
          {editingCategory && freshCategoryData?.path && (
            <p className="text-xs text-fashion-600 font-medium pt-0.5">
              Path: {formatCategoryPath(freshCategoryData.path)}
            </p>
          )}
        </DialogHeader>
        <div id="dialog-description" className="sr-only">
          {editingCategory
            ? `Edit the details of category ${activeCategoryName || ''}.`
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
            key={freshCategoryData?.id || parentCategoryId || 'new-category'}
            initialData={
              freshCategoryData ||
              (parentCategoryId ? { parent: parentCategoryId } : undefined)
            }
            categories={categories}
            onSave={onSave}
            onCancel={onCancel}
            isLoading={isLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CategoryFormDialog;
