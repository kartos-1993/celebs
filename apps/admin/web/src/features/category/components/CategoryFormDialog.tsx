/**
 * Category form dialog wrapper component
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CategoryForm from './categoryform';
import { Category, CategoryFormData } from '../types';

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>{' '}
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
