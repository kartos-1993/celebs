/**
 * Category Management Component
 * Clean, well-structured component following React best practices
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderTree, FolderPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { CategoryFormDialog } from './components/CategoryFormDialog';
import { CategoryTreeTable } from './components/CategoryTreeTable';
import { DeleteCategoryDialog } from './components/DeleteCategoryDialog';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { LoadingState } from './components/LoadingState';

import { useCategories } from './hooks/useCategories';
import { useCategoryState } from './hooks/useCategoryState';

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
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const { uiState, actions } = useCategoryState();

  const handleSaveCategory = async (formData: any) => {
    try {
      if (uiState.editingCategory) {
        await updateCategory(uiState.editingCategory._id, formData);
      } else {
        await createCategory({
          ...formData,
          parent: uiState.parentCategoryId,
        });
      }
      actions.closeForm();
    } catch (error) {
      // Error is handled by the mutation in useCategories
    }
  };
  const handleConfirmDelete = async () => {
    if (uiState.categoryToDelete) {
      try {
        const targetCategory = categories.find(
          (c) => c._id === uiState.categoryToDelete,
        );
        const hasChildren = categories.some(
          (c) => c.parent === uiState.categoryToDelete,
        );

        toast({
          title: 'Deleting Category',
          description: hasChildren
            ? `Deleting '${targetCategory?.name}' and its subcategories...`
            : `Deleting '${targetCategory?.name}'...`,
        });

        await deleteCategory(uiState.categoryToDelete);
        actions.closeDeleteDialog();
      } catch (error) {
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-fashion-700">Categories</h1>
          <p className="text-gray-500 mt-1">
            Manage product categories and attributes
          </p>
        </div>

        <Button
          className="bg-fashion-700 hover:bg-fashion-800 dark:bg-fashion-600 dark:hover:bg-fashion-700 dark:text-white"
          onClick={actions.openAddCategoryForm}
        >
          <FolderPlus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>
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
            <EmptyState onAddCategory={actions.openAddCategoryForm} />
          ) : (
            <CategoryTreeTable
              categoryTree={categoryTree}
              expandedCategories={uiState.expandedCategories}
              onToggleExpand={actions.toggleCategory}
              onEdit={actions.openEditForm}
              onDelete={actions.openDeleteDialog}
              onAddSubcategory={actions.openAddSubcategoryForm}
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
      />{' '}
      <DeleteCategoryDialog
        open={uiState.isDeleteDialogOpen}
        onOpenChange={actions.setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={actions.closeDeleteDialog}
        category={
          uiState.categoryToDelete
            ? {
                name:
                  categories.find((c) => c._id === uiState.categoryToDelete)
                    ?.name || '',
                hasChildren: categories.some(
                  (c) => c.parent === uiState.categoryToDelete,
                ),
                childCount: categories.filter(
                  (c) => c.parent === uiState.categoryToDelete,
                ).length,
                attributes:
                  categories.find((c) => c._id === uiState.categoryToDelete)
                    ?.attributes || [],
              }
            : undefined
        }
      />
    </div>
  );
};

export default Categories;
