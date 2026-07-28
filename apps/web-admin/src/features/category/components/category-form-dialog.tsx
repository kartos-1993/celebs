/**
 * Category form dialog wrapper component
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import CategoryForm from './category-form';
import { Category } from '../types';
import { CategoryFormData } from '../schemas/category-form-schema';

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
        <CategoryForm
          initialData={
            editingCategory ||
            (parentCategoryId ? { parent: parentCategoryId } : undefined)
          }
          categories={categories}
          onSave={onSave}
          onCancel={onCancel}
        />
      </DialogContent>
    </Dialog>
  );
};

