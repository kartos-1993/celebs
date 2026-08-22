/**
 * Category form dialog wrapper component
 * Fetches fresh category details by ID when editing to guarantee latest database state.
 */

import React from 'react';

import type { CreateCategoryType as CategoryFormData } from '@celebs/shared-types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { useCategory } from '../hooks/use-categories';
import { Category } from '../types';

import CategoryForm from './category-form';

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
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          {editingCategory && freshCategoryData?.path && (
            <p className="text-xs text-muted-foreground font-medium pt-0.5">
              Path: {formatCategoryPath(freshCategoryData.path)}
            </p>
          )}
          <DialogDescription className="sr-only">
            {editingCategory
              ? `Edit the details of category ${activeCategoryName || ''}.`
              : parentCategoryId
                ? 'Add a subcategory under the selected parent category.'
                : 'Add a new category to the list.'}
          </DialogDescription>
        </DialogHeader>

        {editingId && isLoadingDetail ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Spinner size="xl" className="text-primary" />
            <span className="text-sm font-medium">Fetching fresh category specifications...</span>
          </div>
        ) : (
          <CategoryForm
            key={freshCategoryData?.id || parentCategoryId || 'new-category'}
            initialData={
              freshCategoryData || (parentCategoryId ? { parentCategory: parentCategoryId } : undefined)
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
