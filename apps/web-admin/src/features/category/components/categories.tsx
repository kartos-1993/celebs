/**
 * Category Management Component
 * Clean, well-structured component following React best practices
 */

import React from 'react';
import { FolderPlus,FolderTree } from 'lucide-react';

import type { CreateCategoryType as CategoryFormData } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

import { useCategories } from '../hooks/use-categories';
import { useCategoryState } from '../hooks/use-category-state';

import { CategoryFormDialog } from './category-form-dialog';
import { CategoryTree } from './category-tree';
import { DeleteCategoryDialog } from './delete-category-dialog';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';

import { useToast } from '@/hooks/use-toast';

/**
 * Main Categories Page Component
 */
export const Categories: React.FC = () => {
  const { toast } = useToast();
  const {
    categories,
    categoryTree,
    isLoading,
    error,
    isCreating,
    isUpdating,
    isDeleting,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const { uiState, actions } = useCategoryState();

  const handleToggleActive = async (categoryId: string, isActive: boolean) => {
    try {
      await updateCategory(categoryId, { isActive });
      toast({
        title: isActive ? 'Category activated' : 'Category deactivated',
        description: `Successfully set category status.`,
      });
    } catch (err: unknown) {
      const errorObj = err as Error;
      toast({
        variant: 'destructive',
        title: 'Error updating status',
        description: errorObj?.message || 'Please try again later.',
      });
      // Throw error to reset ToggleSwitch state inside child component if needed
      throw err;
    }
  };

  const handleSaveCategory = async (formData: CategoryFormData) => {
    try {
      if (uiState.editingCategory) {
        await updateCategory(uiState.editingCategory.id, formData);
      } else {
        await createCategory({
          ...formData,
          parentCategory: uiState.parentCategoryId,
        });
      }
      actions.closeForm();
    } catch (_error) {
      // Error is handled by the mutation in useCategories
    }
  };
  const handleConfirmDelete = async () => {
    if (uiState.categoryToDelete) {
      try {
        const targetCategory = categories.find((c) => c.id === uiState.categoryToDelete);
        const hasChildren = categories.some((c) => c.parentCategory === uiState.categoryToDelete);

        toast({
          title: 'Deleting Category',
          description: hasChildren
            ? `Deleting '${targetCategory?.name}' and its subcategories...`
            : `Deleting '${targetCategory?.name}'...`,
        });

        await deleteCategory(uiState.categoryToDelete);
        actions.closeDeleteDialog();
      } catch (_error) {
        // Error is handled by the mutation in useCategories
      }
    }
  };

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Categories"
        description="Manage product categories and attributes"
        actions={
          <Button onClick={actions.openAddCategoryForm}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        }
      />
      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Category Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState />
          ) : categoryTree.length === 0 ? (
            <EmptyState
              icon={<FolderPlus className="h-10 w-10" />}
              title="No categories found"
              action={
                <Button onClick={actions.openAddCategoryForm}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Add Your First Category
                </Button>
              }
            />
          ) : (
            <CategoryTree
              categoryTree={categoryTree}
              onEdit={actions.openEditForm}
              onDelete={actions.openDeleteDialog}
              onAddSubcategory={actions.openAddSubcategoryForm}
              onToggleActive={handleToggleActive}
            />
          )}
        </CardContent>
      </Card>
      {/* Dialogs */}
      <CategoryFormDialog
        open={uiState.isFormOpen}
        onOpenChange={actions.setFormOpen}
        editingCategory={uiState.editingCategory}
        parentCategoryId={uiState.parentCategoryId}
        categories={categories}
        onSave={handleSaveCategory}
        onCancel={actions.closeForm}
        isLoading={isCreating || isUpdating}
      />

      <DeleteCategoryDialog
        open={uiState.isDeleteDialogOpen}
        onOpenChange={actions.setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={actions.closeDeleteDialog}
        isLoading={isDeleting}
        category={
          uiState.categoryToDelete
            ? {
                name: categories.find((c) => c.id === uiState.categoryToDelete)?.name || '',
                hasChildren: categories.some((c) => c.parentCategory === uiState.categoryToDelete),
                childCount: categories.filter((c) => c.parentCategory === uiState.categoryToDelete).length,
                attributes:
                  categories.find((c) => c.id === uiState.categoryToDelete)?.attributes || [],
              }
            : undefined
        }
      />
    </div>
  );
};

export default Categories;
